import { incrCache, expireCache } from '../configs/redis';
import { sendEmail } from './mail.service';
import { OtpPurpose } from '../types';
import { AppError } from '../middleware/error.middleware';
import prisma from '../configs/prisma';

const OTP_TTL_SECONDS = 10 * 60;       // 10 minutes
const RATE_LIMIT_TTL_SECONDS = 15 * 60; // 15 minute window
const MAX_OTP_REQUESTS = 3;

function generateOtp(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

// function cacheKey(userId: string, purpose: OtpPurpose): string {
//   return `otp:${userId}:${purpose}`;
// }

// function rateLimitKey(userId: string, purpose: OtpPurpose): string {
//   return `otp_rate:${userId}:${purpose}`;
// }


async function checkRateLimit(userId: string, purpose: OtpPurpose): Promise<void> {
  const rlKey = `otp_rate:${userId}:${purpose}`;
  const attempts = await incrCache(rlKey);
  if (attempts === 1) await expireCache(rlKey, RATE_LIMIT_TTL_SECONDS);
  if (attempts > MAX_OTP_REQUESTS) {
    throw new AppError(`Too many requests. Wait ${RATE_LIMIT_TTL_SECONDS / 60} minutes.`, 429);
  }
}

export async function sendOtp(
  userId: string,
  email: string,
  purpose: OtpPurpose,
): Promise<{ expiresInMinutes: number }> {
  await checkRateLimit(userId, purpose);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  // Store in DB – replace any existing un-consumed OTP for same user+purpose
  await prisma.otpCode.upsert({
    where: { userId_purpose: { userId, purpose } },
    update: { code, expiresAt, consumedAt: null },
    create: { userId, purpose, code, expiresAt },
  });

  const subjects: Record<OtpPurpose, string> = {
    ACCOUNT_VERIFICATION: 'Verify your ChatApp account',
    LOGIN: 'Your ChatApp login code',
    PASSWORD_RESET: 'Your ChatApp password reset code',
  };

  await sendEmail({
    to: email,
    subject: subjects[purpose],
    html: otpEmailTemplate(code, purpose),
  });

  return { expiresInMinutes: OTP_TTL_SECONDS / 60 };
}

/**
 * Validate an OTP. Consumes it on success (one-time use).
 */

export async function verifyOtp(
  email: string,
  otp: string,
  purpose: OtpPurpose,
): Promise<void> {
  const userData = await prisma.user.findUnique({ where: { email } });
  if (!userData) throw new AppError('User not found', 404);
  const userId = userData.id;
  const record = await prisma.otpCode.findUnique({
    where: { userId_purpose: { userId, purpose } },
  });

  if (!record) throw new AppError('OTP not found. Request a new one.', 400);
  if (record.consumedAt) throw new AppError('OTP already used.', 400);
  if (record.expiresAt < new Date()) throw new AppError('OTP expired.', 400);
  if (record.code !== otp) throw new AppError('Invalid OTP code.', 401);

  // Mark as consumed
  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}


function otpEmailTemplate(otp: string, purpose: OtpPurpose): string {
  const labels: Record<OtpPurpose, string> = {
    ACCOUNT_VERIFICATION: 'Verifique sua conta',
    LOGIN: 'completar seu login',
    PASSWORD_RESET: 'redifinir sua senha',
  };

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a1a">Seu codigo de verificação</h2>
      <p style="color:#555">Use the code below to ${labels[purpose]}. Expira em 10 minutos.</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a">${otp}</span>
      </div>
      <p style="color:#888;font-size:13px">Se esta solicitação não foi feita por você, você pode ignorar este email com segurança.</p>
    </div>
  `;
}