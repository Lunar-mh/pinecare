'use strict';

jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../src/services/reminderScheduleService', () => ({
  collectDueReminders: jest.fn(),
}));
jest.mock('../../src/services/reminderPolicyService', () => ({
  checkUserReminderPermission: jest.fn(),
}));
jest.mock('../../src/services/reminderNotificationService', () => ({
  sendFirstReminder: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const cron = require('node-cron');
const reminderScheduleService = require('../../src/services/reminderScheduleService');
const reminderPolicyService = require('../../src/services/reminderPolicyService');
const reminderNotificationService = require('../../src/services/reminderNotificationService');
const logger = require('../../src/utils/logger');
const job = require('../../src/jobs/medicationReminderJob');

describe('medicationReminderJob', () => {
  afterEach(() => {
    job.stop();
    jest.clearAllMocks();
  });

  it('continues processing when a single reminder item throws', async () => {
    reminderScheduleService.collectDueReminders.mockResolvedValue({
      total: 3,
      items: [
        { plan: { id: 1, user_id: 101 }, log: { id: 11 } },
        { plan: { id: 2, user_id: 102 }, log: { id: 12 } },
        { plan: { id: 3, user_id: 103 }, log: { id: 13 } },
      ],
    });

    reminderPolicyService.checkUserReminderPermission
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });

    reminderNotificationService.sendFirstReminder
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('provider down'));

    await expect(job.runOnce(new Date('2026-03-12T08:00:00.000Z'))).resolves.toEqual(
      expect.objectContaining({ total: 3, sent: 1, skipped: 1, failed: 1 })
    );
    expect(logger.error).toHaveBeenCalledWith(
      'medicationReminderJob',
      'item_failed',
      expect.objectContaining({ planId: 2, userId: 102, logId: 12, message: 'provider down' })
    );
  });

  it('manages cron lifecycle and logs scheduled failures', async () => {
    let scheduledHandler;
    const stop = jest.fn();
    cron.schedule.mockImplementationOnce((_expr, handler) => {
      scheduledHandler = handler;
      return { stop };
    });

    reminderScheduleService.collectDueReminders.mockRejectedValueOnce(new Error('collect failed'));

    const firstTask = job.start();
    const secondTask = job.start();

    expect(firstTask).toBe(secondTask);
    expect(cron.schedule).toHaveBeenCalledTimes(1);

    await scheduledHandler();
    expect(logger.error).toHaveBeenCalledWith(
      'medicationReminderJob',
      'run_failed',
      expect.objectContaining({ message: 'collect failed' })
    );

    job.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
