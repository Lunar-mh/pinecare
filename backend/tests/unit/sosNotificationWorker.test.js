'use strict';

jest.mock('../../src/services/sosQueueService', () => ({ dequeue: jest.fn() }));
jest.mock('../../src/services/sosNotificationService', () => ({ consumeTask: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const queueService = require('../../src/services/sosQueueService');
const notificationService = require('../../src/services/sosNotificationService');
const logger = require('../../src/utils/logger');
const worker = require('../../src/jobs/sosNotificationWorker');

describe('sosNotificationWorker', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    worker.stopWorker();
    jest.useRealTimers();
  });

  it('runs queued tasks and skips concurrent runs', async () => {
    let release;
    queueService.dequeue.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
    notificationService.consumeTask.mockImplementationOnce(
      () => new Promise((resolve) => {
        release = resolve;
      })
    );

    const first = worker.runOnce();
    const second = await worker.runOnce();
    expect(second).toEqual({ processed: 0, skipped: true });

    release();
    await expect(first).resolves.toEqual({ processed: 1 });
  });

  it('returns empty result when queue has no tasks', async () => {
    queueService.dequeue.mockResolvedValueOnce([]);
    await expect(worker.runOnce()).resolves.toEqual({ processed: 0 });
  });

  it('returns error details when dequeue fails and manages timer lifecycle', async () => {
    queueService.dequeue.mockRejectedValueOnce(new Error('queue down'));
    await expect(worker.runOnce()).resolves.toEqual({ processed: 0, error: 'queue down' });
    expect(logger.error).toHaveBeenCalled();

    jest.useFakeTimers();
    const timer = worker.startWorker();
    expect(timer).toBeTruthy();
    worker.stopWorker();
  });
});
