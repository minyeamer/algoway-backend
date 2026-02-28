import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}) as RedisClientType;

redisClient.on('connect', () => {
  logger.info('✅ Redis connected');
});

redisClient.on('error', (err: Error) => {
  logger.error('❌ Redis connection error:', err);
});

redisClient.on('reconnecting', () => {
  logger.warn('⚠️ Redis reconnecting...');
});

// Redis 연결
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    process.exit(-1);
  }
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisClient.quit();
});

process.on('SIGINT', async () => {
  await redisClient.quit();
});

// 헬퍼 객체
const redis = {
  client: redisClient,

  async get(key: string): Promise<string | null> {
    return await redisClient.get(key);
  },

  async set(key: string, value: string, ttl: number | null = null): Promise<void> {
    if (ttl) {
      await redisClient.setEx(key, ttl, value);
    } else {
      await redisClient.set(key, value);
    }
  },

  async del(key: string): Promise<void> {
    await redisClient.del(key);
  },

  async exists(key: string): Promise<boolean> {
    return (await redisClient.exists(key)) === 1;
  },

  async expire(key: string, seconds: number): Promise<void> {
    await redisClient.expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    return await redisClient.ttl(key);
  },

  async setJSON<T>(key: string, value: T, ttl: number | null = null): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? (JSON.parse(value) as T) : null;
  },
};

export default redis;
