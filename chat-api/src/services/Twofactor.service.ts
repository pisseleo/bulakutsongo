// services/twofa.service.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';

export async function generateTwoFASecret(userId: string) {
  const secret = speakeasy.generateSecret({ name: `ChatApp:${userId}` });
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
  
  // Guardar secret temporariamente (ou diretamente se o user já tem 2FA)
  await prisma.user2FA.upsert({
    where: { user_id: userId },
    update: { secret: secret.base32 },
    create: { user_id: userId, secret: secret.base32, backup_codes: [] },
  });
  
  return { secret: secret.base32, qrCodeUrl };
}

export function verifyTwoFACode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({ secret, encoding: 'base32', token });
}