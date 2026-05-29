// services/Auth.service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../configs/prisma';
import { AppError } from '../middleware/error.middleware';
import {
  generateTotpSetup,
  confirmTotpSetup,
  validateTotpForUser,
  disableTotp,
  useBackupCode,
} from './totp.service';
import { requestPasswordReset, confirmPasswordReset } from './password.service';

// ==================== REGISTRATION ====================
export const register = async (email: string, full_name: string, password: string) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409);

  const password_hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, full_name, password: password_hash, is_2fa_enabled: false },
  });

  // Optional: temporary token to set up 2FA immediately after registration
  const tempToken = jwt.sign(
    { userId: user.id, setup2FA: true },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return { user, tempToken };
};

// ==================== LOGIN (step 1 - credentials) ====================
export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid credentials', 401);

  // If 2FA is enabled, return a temporary token for the second step
  if (user.is_2fa_enabled) {
    const tempToken = jwt.sign(
      { userId: user.id, step: '2FA' },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' }
    );
    return { requires2FA: true, user: user, tempToken };
  }

  // No 2FA → issue final access token
  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  return { accessToken, user };
};

// ==================== VERIFY 2FA & COMPLETE LOGIN ====================
export const verify2FAAndLogin = async (tempToken: string, code: string) => {
  const decoded: any = jwt.verify(tempToken, process.env.JWT_SECRET!);
  if (decoded.step !== '2FA') throw new AppError('Invalid token', 400);

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) throw new AppError('User not found', 404);

  await validateTotpForUser(user.id, code);

  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  return { accessToken, user };
};

// ==================== INITIATE 2FA SETUP (generate secret & QR) ====================
export const setup2FA = async (userId: string, email: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  if (user.is_2fa_enabled) throw new AppError('2FA is already enabled', 400);

  const { secret, qrCodeDataUrl, manualEntryKey } = await generateTotpSetup(userId, email);
  return { secret, qrCodeDataUrl, manualEntryKey };
};

// ==================== CONFIRM & ENABLE 2FA ====================
export const enable2FA = async (userId: string, code: string) => {
  const { backupCodes } = await confirmTotpSetup(userId, code);
  return { success: true, backupCodes };
};

// ==================== DISABLE 2FA ====================
export const disable2FA = async (userId: string, code: string) => {
  await disableTotp(userId, code);
  return { success: true };
};

// ==================== LOGIN WITH BACKUP CODE (when TOTP unavailable) ====================
export const loginWithBackupCode = async (tempToken: string, backupCode: string) => {
  const decoded: any = jwt.verify(tempToken, process.env.JWT_SECRET!);
  if (decoded.step !== '2FA') throw new AppError('Invalid token', 400);

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) throw new AppError('User not found', 404);

  const { remainingCodes } = await useBackupCode(user.id, backupCode);

  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  return { accessToken, user, remainingCodes };
};

// ==================== PASSWORD RESET (Redis-based, rate limited) ====================
/**
 * Request a password reset email.
 * Uses the new password service with rate limiting and email enumeration protection.
 */
export const requestPasswordResetEmail = async (email: string) => {
  return await requestPasswordReset(email);
};

/**
 * Reset password using the token from the email.
 * Revokes all sessions after successful reset.
 */
export const resetPassword = async (token: string, newPassword: string) => {
  return await confirmPasswordReset(token, newPassword);
};