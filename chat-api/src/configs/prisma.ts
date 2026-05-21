import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    ...(process.env.NODE_ENV === 'development'
      ? [{ emit: 'event' as const, level: 'query' as const }]
      : []),
  ],
});

prisma.$on('error', (e: any) => logger.error('Prisma error', e));

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e: { query: string; duration: number }) =>
    logger.debug(`Prisma (${e.duration}ms): ${e.query}`),
  );
}

export default prisma;