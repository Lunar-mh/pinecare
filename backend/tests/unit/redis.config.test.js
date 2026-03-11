'use strict';

describe('config/redis', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('creates redis client with defaults and registers event listeners', () => {
    const handlers = {};
    const mockRedisInstance = {
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
    };
    const Redis = jest.fn(() => mockRedisInstance);

    jest.doMock('ioredis', () => Redis);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    process.env = { ...originalEnv, REDIS_HOST: '', REDIS_PORT: '' };
    const redis = require('../../src/config/redis');

    expect(redis).toBe(mockRedisInstance);
    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
    });
    expect(mockRedisInstance.on).toHaveBeenCalledTimes(3);

    handlers.error({ message: 'boom' });
    handlers.connect();
    handlers.reconnecting();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('\"module\":\"redis\"'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('\"action\":\"reconnecting\"'));
  });
});
