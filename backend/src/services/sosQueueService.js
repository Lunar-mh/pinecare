'use strict';

const redis = require('../config/redis');
const logger = require('../utils/logger');

const SOS_QUEUE_KEY = process.env.SOS_QUEUE_KEY || 'queue:sos:notification';
const DEFAULT_LOCK_TTL_MS = parseInt(process.env.SOS_LOCK_TTL_MS || '15000', 10);

async function ensureRedisReady() {
  if (redis.status === 'ready' || redis.status === 'connect') {
    return;
  }

  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
}

async function enqueue(task) {
  await ensureRedisReady();
  await redis.rpush(SOS_QUEUE_KEY, JSON.stringify(task));
}

async function enqueueBatch(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return;
  }

  await ensureRedisReady();
  const pipeline = redis.pipeline();
  tasks.forEach((item) => {
    pipeline.rpush(SOS_QUEUE_KEY, JSON.stringify(item));
  });
  await pipeline.exec();
}

async function dequeue(batchSize = 20) {
  await ensureRedisReady();

  const safeBatch = Math.min(200, Math.max(1, Number(batchSize) || 20));
  const list = [];

  for (let i = 0; i < safeBatch; i += 1) {
    const raw = await redis.lpop(SOS_QUEUE_KEY);
    if (!raw) {
      break;
    }

    try {
      list.push(JSON.parse(raw));
    } catch (_err) {
      logger.warn('sosQueueService', 'invalid_task_skipped');
    }
  }

  return list;
}

async function getQueueLength() {
  await ensureRedisReady();
  return redis.llen(SOS_QUEUE_KEY);
}

async function requeue(task) {
  await enqueue(task);
}

async function acquireLock(lockKey, ttlMs = DEFAULT_LOCK_TTL_MS) {
  await ensureRedisReady();

  const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const result = await redis.set(lockKey, token, 'PX', ttlMs, 'NX');

  return result === 'OK' ? token : null;
}

async function releaseLock(lockKey, token) {
  if (!token) {
    return false;
  }

  await ensureRedisReady();

  const script = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    else
      return 0
    end
  `;

  const result = await redis.eval(script, 1, lockKey, token);
  return result === 1;
}

module.exports = {
  SOS_QUEUE_KEY,
  enqueue,
  enqueueBatch,
  dequeue,
  getQueueLength,
  requeue,
  acquireLock,
  releaseLock,
};
