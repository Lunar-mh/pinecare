'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisPassword = String(process.env.REDIS_PASSWORD || '').trim();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  ...(redisPassword ? { password: redisPassword } : {}),
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error('redis', 'connection_error', { message: err.message });
});

redis.on('connect', () => {
  logger.info('redis', 'connected');
});

redis.on('reconnecting', () => {
  logger.warn('redis', 'reconnecting');
});

async function closeRedis() {
  if (redis.status === 'end') {
    return;
  }

  try {
    await redis.quit();
  } catch (_err) {
    redis.disconnect();
  }
}

redis.closeRedis = closeRedis;

module.exports = redis;
