'use strict';

jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../src/services/refillReminderService', () => ({ runDaily: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

const cron = require('node-cron');
const refillReminderService = require('../../src/services/refillReminderService');
const logger = require('../../src/utils/logger');
const job = require('../../src/jobs/refillReminderJob');

describe('refillReminderJob', () => {
  afterEach(() => {
    job.stop();
    jest.clearAllMocks();
  });

  it('delegates runOnce and manages cron lifecycle', async () => {
    refillReminderService.runDaily.mockResolvedValueOnce({ reminded: 3 });
    await expect(job.runOnce(new Date('2026-03-12T00:00:00.000Z'))).resolves.toEqual({ reminded: 3 });

    const stop = jest.fn();
    cron.schedule.mockReturnValueOnce({ stop });
    const task = job.start();
    expect(task).toBeTruthy();
    job.stop();
    expect(stop).toHaveBeenCalled();
  });

  it('logs failures from scheduled execution', async () => {
    let scheduled;
    cron.schedule.mockImplementationOnce((_expr, handler) => {
      scheduled = handler;
      return { stop: jest.fn() };
    });
    refillReminderService.runDaily.mockRejectedValueOnce(new Error('boom'));
    job.start();
    await scheduled();
    expect(logger.error).toHaveBeenCalled();
  });
});
