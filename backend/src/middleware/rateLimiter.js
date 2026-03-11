'use strict';

const redis = require('../config/redis');
const { fail } = require('../utils/response');

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 30;

function createRateLimiter({
  max = MAX_REQUESTS,
  windowSeconds = WINDOW_SECONDS,
  keyPrefix = 'ratelimit',
} = {}) {
  return async function rateLimiter(req, res, next) {
    const userId = req.user && req.user.userId;
    if (!userId) return next();

    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      await redis.zremrangebyscore(key, 0, windowStart);

      const count = await redis.zcard(key);
      if (count >= max) {
        return fail(res, 429, `Too many requests, max ${max} per minute.`, null, 429);
      }

      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, windowSeconds * 2);

      return next();
    } catch (err) {
      console.error('rate_limiter_redis_error', {
        requestId: req.requestId || null,
        message: err.message,
      });
      return next();
    }
  };
}

module.exports = { createRateLimiter };

