import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../configs/prisma';
import { isBlacklisted } from '../services/token.service';
import { AppError } from './error.middleware';
import { AccessTokenPayload, AuthenticatedRequest } from '../types';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('No token provided', 401);

  const token = header.split(' ')[1];

  if (await isBlacklisted(token)) throw new AppError('Token has been revoked', 401);

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
  } catch (err) {
    const e = err as Error;
    throw new AppError(
      e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      401,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, full_name: true, status: true, is_verified: true },
  });

  if (!user) throw new AppError('User not found', 401);
  if (!user.is_verified) throw new AppError('Account not verified. Please check your email.', 403);

  (req as AuthenticatedRequest).user = user;
  (req as AuthenticatedRequest).token = token;
  next();
}