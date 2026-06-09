import {Redis} from 'ioredis';
import { logger } from '../utils/logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  //This is a function that runs automatically when Redis connection fails or drops.
  retryStrategy: (times:number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis retry attempt ${times}, next retry in ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error(`Redis error: ${err.message}`);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

export default redis;