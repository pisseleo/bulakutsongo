import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../configs/prisma';
import { issueTokenPair, rotateRefreshToken, revokeSession, revokeAllSessions } from '../services/token.service';
import { sendOtp, verifyOtp } from '../services/otp.service';
import { validateTotpForUser, generateTotpSetup, confirmTotpSetup, disableTotp, useBackupCode } from '../services/totp.service';
import { requestPasswordReset, confirmPasswordReset } from '../services/password.service';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, full_name } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email is already in use', 409);

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, full_name, password: hash },
    select: { id: true, email: true, full_name: true, phone: true },
  });

  await sendOtp(user.id, user.email, 'ACCOUNT_VERIFICATION');
  res.status(201).json({ success: true, data: { userId: user.id, message: 'Account created. Check your email for the verification code.' } });
}

export async function verifyAccount(req: Request, res: Response): Promise<void> {
  const { email, otp } = req.body;
  await verifyOtp(email, otp, 'ACCOUNT_VERIFICATION');
  await prisma.user.update({ where: { email: email }, data: { is_verified: true } });
  res.json({ success: true, data: { message: 'Account verified. You can now log in.' } });
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  const { email, purpose } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('User not found', 404);
  // FIX: pass userId, not email
  const result = await sendOtp(user.id, user.email, purpose);
  res.json({ success: true, data: result });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid email or password', 401);
  if (!user.is_verified) throw new AppError('Account not verified. Check your email.', 403);

  if (user.is_2fa_enabled) {
    const has2FAApp = !!(await prisma.user2FA.findUnique({ where: { user_id: user.id } }));
    res.json({ success: true, data: { userId: user.id, requires2FA: true, has2FAApp } });
    return;
  }

  const tokens = await issueTokenPair(user, { deviceInfo: req.headers['user-agent'], ipAddress: req.ip });
  res.json({ success: true, data: tokens });
}

export async function loginWith2FA(req: Request, res: Response): Promise<void> {
  const { userId, totpCode, emailOtp } = req.body;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const twofa = await prisma.user2FA.findUnique({ where: { user_id: userId } });
  if (twofa?.secret) {
    if (!totpCode) throw new AppError('TOTP code required', 400);
    await validateTotpForUser(userId, totpCode);
  } else if (emailOtp) {
    await verifyOtp(userId, emailOtp, 'LOGIN');
  } else {
    throw new AppError('TOTP code or email OTP required', 400);
  }

  const tokens = await issueTokenPair(user, { deviceInfo: req.headers['user-agent'], ipAddress: req.ip });
  res.json({ success: true, data: tokens });
}

export async function refreshTokens(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);
  const tokens = await rotateRefreshToken(refreshToken);
  res.json({ success: true, data: tokens });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { user, token } = req as AuthenticatedRequest;
  await revokeSession(user.id, token);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  await revokeAllSessions(user.id);
  res.json({ success: true, data: { message: 'All sessions terminated' } });
}

export async function getTotpSetup(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const result = await generateTotpSetup(user.id, user.email);
  res.json({ success: true, data: result });
}

export async function confirmTotp(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { code } = req.body;
  const result = await confirmTotpSetup(user.id, code);
  res.json({ success: true, data: result });
}

export async function removeTotp(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { code } = req.body;
  await disableTotp(user.id, code);
  res.json({ success: true, data: { message: 'TOTP 2FA disabled' } });
}

export async function verifyBackupCode(req: Request, res: Response): Promise<void> {
  const { userId, code } = req.body;
  const result = await useBackupCode(userId, code);
  res.json({ success: true, data: result });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  const result = await requestPasswordReset(email);
  res.json({ success: true, data: result });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body;
  const result = await confirmPasswordReset(token, newPassword);
  res.json({ success: true, data: result });
}