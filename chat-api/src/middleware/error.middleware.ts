import { Request, Response, NextFunction } from 'express';
import { logger } from '../configs/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: unknown[];
  public readonly isOperational = true;

  constructor(message: string, statusCode = 500, errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const statusCode = (err as AppError).statusCode ?? 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.url}\n${err.stack}`);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...((err as AppError).errors ? { errors: (err as AppError).errors } : {}),
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}