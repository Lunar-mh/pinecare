'use strict';

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis 连接错误:', err.message);
});

redis.on('connect', () => {
  console.log('Redis已连接');
});

redis.on('reconnecting', () => {
  console.log('Redis 正在重连...');
});

module.exports = redis;
