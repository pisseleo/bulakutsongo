import Redis from 'ioredis';
import { logger } from './logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err: Error) => logger.error('Redis error', err));

// ── Typed helpers ─────────────────────────────────────────────────────────────

export const setCache = async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
  const serialised = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, serialised, 'EX', ttlSeconds);
  } else {
    await redis.set(key, serialised);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

export const delCache = async (...keys: string[]): Promise<void> => {
  await redis.del(...keys);
};

export const hasCache = async (key: string): Promise<boolean> => {
  const result = await redis.exists(key);
  return result === 1;
};

export const incrCache = async (key: string): Promise<number> => redis.incr(key);

export const expireCache = async (key: string, ttlSeconds: number): Promise<void> => {
  await redis.expire(key, ttlSeconds);
};

// redis.ts (adicionar no final)
export const redisClient = redis;