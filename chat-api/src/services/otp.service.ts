import { setCache, getCache, delCache, incrCache, expireCache } from '../configs/redis';
import { sendEmail } from './mail.service';
import { OtpPurpose } from '../types';
import { AppError } from '../middleware/error.middleware';

const OTP_TTL_SECONDS = 10 * 60;       // 10 minutes
const RATE_LIMIT_TTL_SECONDS = 15 * 60; // 15 minute window
const MAX_OTP_REQUESTS = 3;

function generateOtp(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

function cacheKey(userId: string, purpose: OtpPurpose): string {
  return `otp:${userId}:${purpose}`;
}

function rateLimitKey(userId: string, purpose: OtpPurpose): string {
  return `otp_rate:${userId}:${purpose}`;
}

/**
 * Generate, store and email a 6-digit OTP.
 * Rate-limited to MAX_OTP_REQUESTS per 15 minutes per user+purpose.
 */
export async function sendOtp(
  userId: string,
  email: string,
  purpose: OtpPurpose,
): Promise<{ expiresInMinutes: number }> {
  const rlKey = rateLimitKey(userId, purpose);
  const attempts = await incrCache(rlKey);

  if (attempts === 1) {
    // First attempt — start the rate-limit window
    await expireCache(rlKey, RATE_LIMIT_TTL_SECONDS);
  }

  if (attempts > MAX_OTP_REQUESTS) {
    throw new AppError(
      `Too many OTP requests. Please wait ${RATE_LIMIT_TTL_SECONDS / 60} minutes.`,
      429,
    );
  }

  const otp = generateOtp();
  await setCache(cacheKey(userId, purpose), otp, OTP_TTL_SECONDS);

  const subjects: Record<OtpPurpose, string> = {
    ACCOUNT_VERIFICATION: 'Verify your ChatApp account',
    LOGIN: 'Your ChatApp login code',
    PASSWORD_RESET: 'Your ChatApp password reset code',
  };

  await sendEmail({
    to: email,
    subject: subjects[purpose],
    html: otpEmailTemplate(otp, purpose),
  });

  return { expiresInMinutes: OTP_TTL_SECONDS / 60 };
}

/**
 * Validate an OTP. Consumes it on success (one-time use).
 */
export async function verifyOtp(
  userId: string,
  otp: string,
  purpose: OtpPurpose,
): Promise<void> {
  const stored = await getCache<string>(cacheKey(userId, purpose));

  if (!stored) {
    throw new AppError('OTP expired or not found. Please request a new one.', 400);
  }

  if (stored !== otp) {
    throw new AppError('Invalid OTP code.', 401);
  }

  // Consume OTP — prevents replay attacks
  await delCache(cacheKey(userId, purpose));
}

function otpEmailTemplate(otp: string, purpose: OtpPurpose): string {
  const labels: Record<OtpPurpose, string> = {
    ACCOUNT_VERIFICATION: 'verify your account',
    LOGIN: 'complete your login',
    PASSWORD_RESET: 'reset your password',
  };

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a1a">Your verification code</h2>
      <p style="color:#555">Use the code below to ${labels[purpose]}. It expires in 10 minutes.</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a">${otp}</span>
      </div>
      <p style="color:#888;font-size:13px">If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;
}