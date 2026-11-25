'use strict';

jest.mock('../../src/config/redis', () => ({
  zremrangebyscore: jest.fn(),
  zcard: jest.fn(),
  zadd: jest.fn(),
  expire: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

const redis = require('../../src/config/redis');
const logger = require('../../src/utils/logger');
const { createRateLimiter } = require('../../src/middleware/rateLimiter');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

describe('rateLimiter middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips anonymous requests', async () => {
    const limiter = createRateLimiter();
    const next = jest.fn();

    await limiter({ requestId: 'req-1' }, createRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(redis.zcard).not.toHaveBeenCalled();
  });

  it('allows requests within the quota and exposes rate limit metadata', async () => {
    redis.zcard.mockResolvedValue(2);
    const limiter = createRateLimiter({ max: 5, windowSeconds: 60, keyPrefix: 'ai' });
    const req = { user: { userId: 18 }, requestId: 'req-2' };
    const res = createRes();
    const next = jest.fn();

    await limiter(req, res, next);

    expect(redis.zremrangebyscore).toHaveBeenCalledWith('yinban:rate_limit:ai:user:18', 0, expect.any(Number));
    expect(redis.zadd).toHaveBeenCalledWith('yinban:rate_limit:ai:user:18', expect.any(Number), expect.stringContaining('req-2'));
    expect(req.rateLimit).toEqual({
      key: 'yinban:rate_limit:ai:user:18',
      limit: 5,
      count: 3,
      remaining: 2,
      windowSeconds: 60,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks requests that exceed the quota', async () => {
    redis.zcard.mockResolvedValue(5);
    const limiter = createRateLimiter({ max: 5, windowSeconds: 60, keyPrefix: 'ai' });
    const req = { user: { userId: 18 }, requestId: 'req-3' };
    const res = createRes();
    const next = jest.fn();

    await limiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.body.message).toBe('Too many requests. Maximum 5 per minute.');
    expect(req.rateLimit.remaining).toBe(0);
  });

  it('logs redis failures and fails open', async () => {
    redis.zremrangebyscore.mockRejectedValue(new Error('redis down'));
    const limiter = createRateLimiter();
    const req = { user: { userId: 18 }, requestId: 'req-4' };
    const res = createRes();
    const next = jest.fn();

    await limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'rateLimiter',
      'redis_error',
      expect.objectContaining({ actorId: 'user:18', key: 'yinban:rate_limit:ratelimit:user:18', message: 'redis down' })
    );
  });
});
