'use strict';

jest.mock('../../src/config/redis', () => ({
  status: 'wait',
  connect: jest.fn(),
  rpush: jest.fn(),
  pipeline: jest.fn(),
  lpop: jest.fn(),
  llen: jest.fn(),
  set: jest.fn(),
  eval: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({ warn: jest.fn() }));

const redis = require('../../src/config/redis');
const logger = require('../../src/utils/logger');
const queueService = require('../../src/services/sosQueueService');

describe('sosQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis.status = 'wait';
    redis.pipeline.mockReturnValue({ rpush: jest.fn(), exec: jest.fn().mockResolvedValue([]) });
  });

  it('connects redis and enqueues tasks', async () => {
    await queueService.enqueue({ id: 1 });
    expect(redis.connect).toHaveBeenCalled();
    expect(redis.rpush).toHaveBeenCalled();

    await queueService.enqueueBatch([{ id: 1 }, { id: 2 }]);
    expect(redis.pipeline).toHaveBeenCalled();
  });

  it('dequeues valid tasks and skips invalid payloads', async () => {
    redis.status = 'ready';
    redis.lpop
      .mockResolvedValueOnce('{"id":1}')
      .mockResolvedValueOnce('bad-json')
      .mockResolvedValueOnce(null);

    await expect(queueService.dequeue(3)).resolves.toEqual([{ id: 1 }]);
    expect(logger.warn).toHaveBeenCalledWith('sosQueueService', 'invalid_task_skipped');
  });

  it('supports queue length and lock helpers', async () => {
    redis.status = 'ready';
    redis.llen.mockResolvedValueOnce(5);
    redis.set.mockResolvedValueOnce('OK');
    redis.eval.mockResolvedValueOnce(1);

    await expect(queueService.getQueueLength()).resolves.toBe(5);
    const token = await queueService.acquireLock('lock-key', 1000);
    expect(token).toBeTruthy();
    await expect(queueService.releaseLock('lock-key', token)).resolves.toBe(true);
  });
});
