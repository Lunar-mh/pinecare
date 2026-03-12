'use strict';

jest.mock('node-cron', () => ({ schedule: jest.fn(), validate: jest.fn() }));
jest.mock('../../src/services/sosService', () => ({ autoResolveTimeoutEvents: jest.fn() }));
jest.mock('../../src/services/sosQueueService', () => ({ acquireLock: jest.fn(), releaseLock: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const cron = require('node-cron');
const sosService = require('../../src/services/sosService');
const queueService = require('../../src/services/sosQueueService');
const logger = require('../../src/utils/logger');
const job = require('../../src/jobs/sosAutoResolveJob');

describe('sosAutoResolveJob', () => {
  afterEach(() => {
    job.stopAutoResolveJob();
    jest.clearAllMocks();
  });

  it('skips when lock is unavailable and resolves when lock exists', async () => {
    queueService.acquireLock.mockResolvedValueOnce(null).mockResolvedValueOnce('token');
    queueService.releaseLock.mockResolvedValueOnce(true);
    sosService.autoResolveTimeoutEvents.mockResolvedValueOnce({ resolved_count: 2 });

    await expect(job.runAutoResolveOnce()).resolves.toEqual({ resolved_count: 0, skipped: true });
    await expect(job.runAutoResolveOnce()).resolves.toEqual({ resolved_count: 2 });
    expect(queueService.releaseLock).toHaveBeenCalledWith(expect.any(String), 'token');
  });

  it('validates cron and logs schedule failures', async () => {
    cron.validate.mockReturnValueOnce(true);
    const stop = jest.fn();
    cron.schedule.mockReturnValueOnce({ stop });
    const timer = job.startAutoResolveJob();
    expect(timer).toBeTruthy();
    job.stopAutoResolveJob();
    expect(stop).toHaveBeenCalled();

    cron.validate.mockReturnValueOnce(false);
    expect(() => job.startAutoResolveJob()).toThrow(/invalid/);

    queueService.acquireLock.mockResolvedValueOnce('token');
    queueService.releaseLock.mockResolvedValueOnce(true);
    sosService.autoResolveTimeoutEvents.mockRejectedValueOnce(new Error('boom'));
    await expect(job.runAutoResolveOnce()).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalled();
  });
});
