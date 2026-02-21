'use strict';

const redis = require('../config/redis');

/**
 * 基于 Redis 滑动窗口的请求限流中间件
 * AI 接口限制：30次/分钟/用户
 * 超限返回 429
 */

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 30;

/**
 * 创建限流中间件
 * @param {Object} opts - { max, windowSeconds, keyPrefix }
 * @returns {Function} Express 中间件
 */
function createRateLimiter({
  max = MAX_REQUESTS,
  windowSeconds = WINDOW_SECONDS,
  keyPrefix = 'ratelimit',
} = {}) {
  return async function rateLimiter(req, res, next) {
    // 依赖 auth 中间件先注入 req.user
    const userId = req.user && req.user.userId;
    if (!userId) return next();

    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // 滑动窗口：移除窗口外的旧记录
      await redis.zremrangebyscore(key, 0, windowStart);

      // 统计当前窗口内请求数
      const count = await redis.zcard(key);

      if (count >= max) {
        return res.status(429).json({
          code: 429,
          message: `请求过于频繁，每分钟最多允许 ${max} 次咨询`,
          data: null,
        });
      }

      // 记录本次请求
      await redis.zadd(key, now, `${now}-${Math.random()}`);
      // 设置过期时间避免内存泄漏
      await redis.expire(key, windowSeconds * 2);

      next();
    } catch (err) {
      // Redis 故障时放行，不影响主业务
      console.error('限流中间件 Redis 错误:', err.message);
      next();
    }
  };
}

module.exports = { createRateLimiter };
