'use strict';

jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../src/models/medicationLogModel', () => ({
  listPendingForSecondReminder: jest.fn(),
  listPendingForMissed: jest.fn(),
  markMissed: jest.fn(),
}));
jest.mock('../../src/models/medicationPlanModel', () => ({
  getById: jest.fn(),
}));
jest.mock('../../src/services/reminderPolicyService', () => ({
  checkUserReminderPermission: jest.fn(),
}));
jest.mock('../../src/services/reminderNotificationService', () => ({
  sendSecondReminder: jest.fn(),
}));
jest.mock('../../src/services/familyNotificationService', () => ({
  notifyMissedMedication: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const cron = require('node-cron');
const medicationLogModel = require('../../src/models/medicationLogModel');
const medicationPlanModel = require('../../src/models/medicationPlanModel');
const reminderPolicyService = require('../../src/services/reminderPolicyService');
const reminderNotificationService = require('../../src/services/reminderNotificationService');
const familyNotificationService = require('../../src/services/familyNotificationService');
const logger = require('../../src/utils/logger');
const job = require('../../src/jobs/medicationFollowupJob');

describe('medicationFollowupJob', () => {
  afterEach(() => {
    job.stop();
    jest.clearAllMocks();
  });

  it('continues processing second reminders and missed followups when one item fails', async () => {
    medicationLogModel.listPendingForSecondReminder.mockResolvedValue([
      { id: 21, user_id: 101, plan_id: 1, medication_name: 'A', dosage: '1' },
      { id: 22, user_id: 102, plan_id: 2, medication_name: 'B', dosage: '1' },
      { id: 23, user_id: 103, plan_id: 3, medication_name: 'C', dosage: '1' },
    ]);
    medicationLogModel.listPendingForMissed.mockResolvedValue([
      { id: 31, user_id: 101, plan_id: 1, medication_name: 'A', dosage: '1' },
      { id: 32, user_id: 104, plan_id: 4, medication_name: 'D', dosage: '1' },
    ]);

    reminderPolicyService.checkUserReminderPermission
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });

    medicationPlanModel.getById
      .mockResolvedValueOnce({ id: 1, user_id: 101, medication_name: 'A', dosage: '1' })
      .mockRejectedValueOnce(new Error('plan query failed'))
      .mockResolvedValueOnce(null);

    reminderNotificationService.sendSecondReminder.mockResolvedValueOnce({ success: true });
    medicationLogModel.markMissed.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    familyNotificationService.notifyMissedMedication
      .mockResolvedValueOnce({ success: true, skipped: false })
      .mockRejectedValueOnce(new Error('family notify failed'));

    await expect(job.runOnce(new Date('2026-03-12T10:05:00.000Z'))).resolves.toEqual(
      expect.objectContaining({
        second_total: 3,
        second_sent: 1,
        second_skipped: 1,
        second_failed: 1,
        missed_total: 2,
        marked_missed: 2,
        family_notified: 1,
        family_failed: 1,
      })
    );

    expect(logger.error).toHaveBeenCalledWith(
      'medicationFollowupJob',
      'second_reminder_failed',
      expect.objectContaining({ logId: 22, planId: 2, userId: 102, message: 'plan query failed' })
    );
    expect(logger.error).toHaveBeenCalledWith(
      'medicationFollowupJob',
      'missed_followup_failed',
      expect.objectContaining({ logId: 32, planId: 4, userId: 104, message: 'family notify failed' })
    );
  });

  it('manages cron lifecycle and logs scheduled failures', async () => {
    let scheduledHandler;
    const stop = jest.fn();
    cron.schedule.mockImplementationOnce((_expr, handler) => {
      scheduledHandler = handler;
      return { stop };
    });

    medicationLogModel.listPendingForSecondReminder.mockRejectedValueOnce(new Error('query failed'));

    const firstTask = job.start();
    const secondTask = job.start();

    expect(firstTask).toBe(secondTask);
    expect(cron.schedule).toHaveBeenCalledTimes(1);

    await scheduledHandler();
    expect(logger.error).toHaveBeenCalledWith(
      'medicationFollowupJob',
      'run_failed',
      expect.objectContaining({ message: 'query failed' })
    );

    job.stop();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
