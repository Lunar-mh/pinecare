'use strict';

const redis = require('../config/redis');
const { fail } = require('../utils/response');
const logger = require('../utils/logger');

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 30;

function resolveActorId(req) {
  const rawUserId = req.user && req.user.userId;
  const parsedUserId = Number(rawUserId);
  if (Number.isInteger(parsedUserId) && parsedUserId > 0) {
    return parsedUserId;
  }

  return null;
}

function buildWindowMember(req, timestamp) {
  if (req && req.requestId) {
    return `${timestamp}-${req.requestId}`;
  }

  return `${timestamp}-${Math.random()}`;
}

function createRateLimiter({
  max = MAX_REQUESTS,
  windowSeconds = WINDOW_SECONDS,
  keyPrefix = 'ratelimit',
} = {}) {
  return async function rateLimiter(req, res, next) {
    const actorId = resolveActorId(req);
    if (!actorId) {
      return next();
    }

    const key = `${keyPrefix}:user:${actorId}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      await redis.zremrangebyscore(key, 0, windowStart);

      const count = await redis.zcard(key);
      if (count >= max) {
        req.rateLimit = {
          key,
          limit: max,
          count,
          remaining: 0,
          windowSeconds,
        };
        return fail(res, 429, `Too many requests, max ${max} per minute.`, null, 429);
      }

      await redis.zadd(key, now, buildWindowMember(req, now));
      await redis.expire(key, windowSeconds * 2);

      req.rateLimit = {
        key,
        limit: max,
        count: count + 1,
        remaining: Math.max(max - (count + 1), 0),
        windowSeconds,
      };

      return next();
    } catch (error) {
      logger.error('rateLimiter', 'redis_error', {
        requestId: req.requestId || null,
        actorId,
        key,
        message: error.message,
      });
      return next();
    }
  };
}

module.exports = { createRateLimiter };
