import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let lastErrorLog = 0;

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  connectTimeout: 2000,
  retryStrategy(times) {
    return Math.min(times * 1000, 5000);
  },
});

redis.on('connect', () => {
  logger.info('Redis Connected (100% Free Local Open-Source Cache)');
});

redis.on('error', (err: any) => {
  const now = Date.now();
  // Throttle error logs to once every 10 seconds to avoid spamming
  if (now - lastErrorLog > 10000) {
    lastErrorLog = now;
    logger.warn(`Redis connection notice (${err.code || err.message}). In-memory fallback is active.`);
  }
});
