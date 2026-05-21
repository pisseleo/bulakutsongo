import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../configs/prisma';
import { setCache, getCache, delCache, incrCache, expireCache } from '../configs/redis';
import { sendPasswordResetEmail, sendPasswordChangedEmail, sendEmail } from './mail.service';
import { revokeAllSessions } from './token.service';
import { AppError } from '../middleware/error.middleware';

const TOKEN_TTL_SECONDS = 60 * 60;         // 1 hour
const RATE_LIMIT_TTL_SECONDS = 60 * 60;   // 1 hour window
const MAX_REQUESTS = 3;

const TOKEN_EXPIRY_MINUTES = 60; 

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Request a password reset. Sends an email with a signed reset link.
 * Always returns success to prevent email enumeration.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const GENERIC_RESPONSE = {
    message: 'If that email exists, a reset link has been sent.',
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return GENERIC_RESPONSE;

  // Rate limit: max 3 resets per hour per user
  const rlKey = `pwd_reset_rate:${user.id}`;
  const attempts = await incrCache(rlKey);
  if (attempts === 1) await expireCache(rlKey, RATE_LIMIT_TTL_SECONDS);
  if (attempts > MAX_REQUESTS) return GENERIC_RESPONSE;

  // Generate a cryptographically secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);

  // Store the hashed token → userId mapping in Redis
  await setCache(`pwd_reset:${hashedToken}`, user.id, TOKEN_TTL_SECONDS);

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, user.full_name, resetUrl);

  return GENERIC_RESPONSE;
}

/**
 * Confirm a password reset using the token from the email link.
 * Invalidates ALL sessions after a successful reset.
 */
export async function confirmPasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<{ message: string }> {
  const hashedToken = hashToken(rawToken);
  const userId = await getCache<string>(`pwd_reset:${hashedToken}`);

  if (!userId) {
    throw new AppError('Reset token is invalid or has expired.', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404);

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Atomically update password + revoke token
  await prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
  await delCache(`pwd_reset:${hashedToken}`);

  // Revoke ALL sessions — forces re-login on all devices
  await revokeAllSessions(userId);

  await sendPasswordChangedEmail(user.email, user.full_name);

  return {
    message: 'Password reset successfully. Please log in with your new password.',
  };
}

export async function generatePasswordResetToken(userId: string): Promise<string> {
  // Generate a cryptographically secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRY_MINUTES);

  // Store the hashed token in the database
  await prisma.passwordResetToken.create({
    data: {
      user_id: userId,
      token: hashedToken,
      expires_at: expiresAt,
      used: false,
    },
  });

  return rawToken;
}

/**
 * Send a password reset email containing the reset link.
 */
export async function sendResetEmail(email: string, rawToken: string): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#1a1a1a">Reset your password</h2>
      <p style="color:#555">Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin:24px 0">Reset password</a>
      <p style="color:#888;font-size:13px">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Reset your ChatApp password',
    html,
  });
}