import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { StringValue } from 'ms';

import prisma from '../configs/prisma';
import { setCache, getCache } from '../configs/redis';
import { AccessTokenPayload, RefreshTokenPayload } from '../types';
import { User } from '@/generated/prisma';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES || '15m') as StringValue;
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES || '7d') as StringValue;
const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Issue a JWT access + refresh token pair and persist session to DB.
 */
export async function issueTokenPair(
  user: Pick<User, 'id' | 'email'>,
  meta?: { deviceInfo?: string; ipAddress?: string },
): Promise<TokenPair> {
  const jti = uuid();

  const accessOptions: SignOptions = { expiresIn: ACCESS_EXPIRES };
  const refreshOptions: SignOptions = { expiresIn: REFRESH_EXPIRES };

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, jti } as AccessTokenPayload,
    ACCESS_SECRET,
    accessOptions,
  );

  const refreshToken = jwt.sign(
    { sub: user.id, jti } as RefreshTokenPayload,
    REFRESH_SECRET,
    refreshOptions,
  );

  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000);

  await prisma.session.create({
    data: {
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      device_info: meta?.deviceInfo ?? null,
      ip_address: meta?.ipAddress ?? null,
      expires_at: expiresAt,
    },
  });

  // Access token expiry in seconds (parse from string like '15m')
  const accessExpirySeconds = parseDurationToSeconds(ACCESS_EXPIRES);
  return { accessToken, refreshToken, expiresIn: accessExpirySeconds };
}

/**
 * Parse duration string (e.g., '15m', '1h', '2d') to seconds.
 */
function parseDurationToSeconds(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900; // default 15 min
  }
}

/**
 * Rotate a refresh token: validate → delete old session → issue new pair.
 */
export async function rotateRefreshToken(
  refreshToken: string,
): Promise<TokenPair> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const session = await prisma.session.findUnique({ where: { refresh_token: refreshToken } });
  if (!session || session.expires_at < new Date()) {
    throw Object.assign(new Error('Session expired or not found'), { statusCode: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: payload.sub },
    select: { id: true, email: true },
  });

  // Invalidate old session (refresh token rotation prevents replay attacks)
  await prisma.session.delete({ where: { id: session.id } });

  return issueTokenPair(user, {
    deviceInfo: session.device_info ?? undefined,
    ipAddress: session.ip_address ?? undefined,
  });
}

/**
 * Blacklist an access token in Redis until it naturally expires.
 * Called on logout so the token is immediately invalid.
 */
export async function blacklistToken(token: string): Promise<void> {
  const decoded = jwt.decode(token) as AccessTokenPayload | null;
  if (!decoded?.exp) return;
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) await setCache(`blacklist:${token}`, '1', ttl);
}

export async function isBlacklisted(token: string): Promise<boolean> {
  return !!(await getCache(`blacklist:${token}`));
}

/**
 * Terminate a single session (logout one device).
 */
export async function revokeSession(userId: string, accessToken: string): Promise<void> {
  await blacklistToken(accessToken);
  await prisma.session.deleteMany({ where: { user_id: userId, access_token: accessToken } });
}

/**
 * Terminate ALL sessions for a user (e.g. after password reset).
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  const sessions = await prisma.session.findMany({
    where: { user_id: userId },
    select: { access_token: true },
  });
  await Promise.all(sessions.map((s: any) => blacklistToken(s.access_token)));
  await prisma.session.deleteMany({ where: { user_id: userId } });
}