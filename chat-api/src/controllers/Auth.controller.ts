import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../configs/prisma';
import { issueTokenPair, rotateRefreshToken, revokeSession, revokeAllSessions } from '../services/token.service';
import { sendOtp, verifyOtp } from '../services/otp.service';
import { validateTotpForUser, generateTotpSetup, confirmTotpSetup, disableTotp, useBackupCode } from '../services/totp.service';
import { requestPasswordReset, confirmPasswordReset } from '../services/password.service';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

// ── Register ──────────────────────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, full_name } = req.body as {
    email: string; password: string; full_name: string;
  };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email is already in use', 409);

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, full_name, password: hash },
    select: { id: true, email: true, full_name: true },
  });

  await sendOtp(user.id, user.email, 'ACCOUNT_VERIFICATION');

  res.status(201).json({
    success: true,
    data: {
      userId: user.id,
      message: 'Account created. Check your email for the verification code.',
    },
  });
}

// ── Verify Account ────────────────────────────────────────────────────────────
export async function verifyAccount(req: Request, res: Response): Promise<void> {
  const { userId, otp } = req.body as { userId: string; otp: string };

  await verifyOtp(userId, otp, 'ACCOUNT_VERIFICATION');
  await prisma.user.update({ where: { id: userId }, data: { is_verified: true } });

  res.json({ success: true, data: { message: 'Account verified. You can now log in.' } });
}

// ── Resend OTP ────────────────────────────────────────────────────────────────
export async function resendOtp(req: Request, res: Response): Promise<void> {
  const { userId, purpose } = req.body as { userId: string; purpose: string };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new AppError('User not found', 404);

  const result = await sendOtp(userId, user.email, purpose as 'ACCOUNT_VERIFICATION' | 'LOGIN');
  res.json({ success: true, data: result });
}

// ── Login Step 1: credentials ─────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Invalid email or password', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError('Invalid email or password', 401);

  if (!user.is_verified) throw new AppError('A tua conta nao foi verificada, verifique teu email.', 403);

  if (user.is_2fa_enabled) {
    // Step 1 done — client must proceed to /auth/login/2fa
    res.json({
      success: true,
      data: { userId: user.id, requires2FA: true, has2FAApp: !!(await prisma.user2FA.findUnique({ where: { user_id: user.id } })) },
    });
    return;
  }

  // No 2FA configured — issue tokens directly
  const tokens = await issueTokenPair(user, {
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  res.json({ success: true, data: tokens });
}

// ── Login Step 2: 2FA ─────────────────────────────────────────────────────────
export async function loginWith2FA(req: Request, res: Response): Promise<void> {
  const { userId, totpCode, emailOtp } = req.body as {
    userId: string;
    totpCode?: string;
    emailOtp?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const twofa = await prisma.user2FA.findUnique({ where: { user_id: userId } });

  if (twofa?.secret) {
    // TOTP app verification
    if (!totpCode) throw new AppError('TOTP code required', 400);
    await validateTotpForUser(userId, totpCode);
  } else if (emailOtp) {
    // Email OTP fallback
    await verifyOtp(userId, emailOtp, 'LOGIN');
  } else {
    throw new AppError('TOTP code or email OTP required', 400);
  }

  const tokens = await issueTokenPair(user, {
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  res.json({ success: true, data: tokens });
}

// ── Refresh tokens ────────────────────────────────────────────────────────────
export async function refreshTokens(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  const tokens = await rotateRefreshToken(refreshToken);
  res.json({ success: true, data: tokens });
}

// ── Logout ────────────────────────────────────────────────────────────────────
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

// ── TOTP 2FA setup ────────────────────────────────────────────────────────────
export async function getTotpSetup(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const result = await generateTotpSetup(user.id, user.email);
  res.json({ success: true, data: result });
}

export async function confirmTotp(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { code } = req.body as { code: string };
  const result = await confirmTotpSetup(user.id, code);
  res.json({ success: true, data: result });
}

export async function removeTotp(req: Request, res: Response): Promise<void> {
  const { user } = req as AuthenticatedRequest;
  const { code } = req.body as { code: string };
  await disableTotp(user.id, code);
  res.json({ success: true, data: { message: 'TOTP 2FA disabled' } });
}

export async function verifyBackupCode(req: Request, res: Response): Promise<void> {
  const { userId, code } = req.body as { userId: string; code: string };
  const result = await useBackupCode(userId, code);
  res.json({ success: true, data: result });
}

// ── Password reset ────────────────────────────────────────────────────────────
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const result = await requestPasswordReset(email);
  res.json({ success: true, data: result });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  const result = await confirmPasswordReset(token, newPassword);
  res.json({ success: true, data: result });
}