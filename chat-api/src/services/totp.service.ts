import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';
import { setCache, getCache, delCache } from '../configs/redis';
import prisma from '../configs/prisma';
import { AppError } from '../middleware/error.middleware';

const TOTP_SETUP_TTL = 5 * 60; // 5 minutes to confirm setup

interface TotpSetupResult {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

/**
 * Generate a TOTP secret and QR code for an Authenticator app.
 * The secret is stored temporarily in Redis until confirmed.
 */
export async function generateTotpSetup(
  userId: string,
  email: string,
): Promise<TotpSetupResult> {
  const generated = speakeasy.generateSecret({
    name: `ChatApp (${email})`,
    issuer: 'ChatApp',
    length: 32,
  });

  // Temporarily cache the secret pending confirmation
  await setCache(`totp_setup:${userId}`, generated.base32, TOTP_SETUP_TTL);

  const qrCodeDataUrl = await QRCode.toDataURL(generated.otpauth_url!);

  return {
    secret: generated.base32,
    qrCodeDataUrl,
    manualEntryKey: generated.base32,
  };
}

/**
 * Confirm TOTP setup by verifying the first code from the Authenticator app.
 * Saves the secret + backup codes to the database.
 */
export async function confirmTotpSetup(
  userId: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  const secret = await getCache<string>(`totp_setup:${userId}`);
  if (!secret) {
    throw new AppError('TOTP setup session expired. Please start over.', 400);
  }

  const valid = verifyTotpCode(secret, code);
  if (!valid) {
    throw new AppError('Invalid code. Please try again with your Authenticator app.', 400);
  }

  // Generate 8 one-time backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    `${uuid().replace(/-/g, '').slice(0, 4)}-${uuid().replace(/-/g, '').slice(0, 4)}`.toUpperCase(),
  );

  await prisma.user2FA.upsert({
    where: { user_id: userId },
    create: { user_id: userId, totp_secret: secret, backup_codes: backupCodes },
    update: { totp_secret: secret, backup_codes: backupCodes },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { is_2fa_enabled: true },
  });

  await delCache(`totp_setup:${userId}`);

  return { backupCodes };
}

/**
 * Verify a TOTP code against a stored secret.
 * Allows ±30s clock drift (window: 1).
 */
export function verifyTotpCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code.replace(/\s/g, ''),
    window: 1,
  });
}

/**
 * Validate TOTP for login (fetches secret from DB).
 */
export async function validateTotpForUser(userId: string, code: string): Promise<void> {
  const twofa = await prisma.user2FA.findUnique({ where: { user_id: userId } });
  if (!twofa?.totp_secret) {
    throw new AppError('TOTP not configured for this account.', 400);
  }
  if (!verifyTotpCode(twofa.totp_secret, code)) {
    throw new AppError('Invalid TOTP code.', 401);
  }
}

/**
 * Disable TOTP for a user (requires a valid code as confirmation).
 */
export async function disableTotp(userId: string, code: string): Promise<void> {
  const twofa = await prisma.user2FA.findUnique({ where: { user_id: userId } });
  if (!twofa?.totp_secret) throw new AppError('TOTP is not enabled.', 400);
  if (!verifyTotpCode(twofa.totp_secret, code)) throw new AppError('Invalid TOTP code.', 401);

  await prisma.user2FA.delete({ where: { user_id: userId } });
  await prisma.user.update({ where: { id: userId }, data: { is_2fa_enabled: false } });
}

/**
 * Consume a one-time backup code. Removes it from the DB after use.
 */
export async function useBackupCode(
  userId: string,
  code: string,
): Promise<{ remainingCodes: number }> {
  const twofa = await prisma.user2FA.findUnique({ where: { user_id: userId } });
  if (!twofa) throw new AppError('2FA not configured.', 400);

  const normalised = code.toUpperCase().replace(/\s/g, '');
  const idx = twofa.backup_codes.indexOf(normalised);
  if (idx === -1) throw new AppError('Invalid backup code.', 401);

  const remaining = twofa.backup_codes.filter((_, i) => i !== idx);
  await prisma.user2FA.update({
    where: { user_id: userId },
    data: { backup_codes: remaining },
  });

  return { remainingCodes: remaining.length };
}