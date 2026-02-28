const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connected');
});

redisClient.on('error', (err) => {
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

// 헬퍼 함수
const redis = {
  client: redisClient,

  // GET
  async get(key) {
    return await redisClient.get(key);
  },

  // SET with TTL
  async set(key, value, ttl = null) {
    if (ttl) {
      return await redisClient.setEx(key, ttl, value);
    }
    return await redisClient.set(key, value);
  },

  // DELETE
  async del(key) {
    return await redisClient.del(key);
  },

  // EXISTS
  async exists(key) {
    return await redisClient.exists(key);
  },

  // EXPIRE
  async expire(key, seconds) {
    return await redisClient.expire(key, seconds);
  },

  // TTL
  async ttl(key) {
    return await redisClient.ttl(key);
  },

  // JSON 저장/조회
  async setJSON(key, value, ttl = null) {
    return await this.set(key, JSON.stringify(value), ttl);
  },

  async getJSON(key) {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  },
};

module.exports = redis;
