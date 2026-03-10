'use strict';

jest.mock('../src/services/reminderScheduleService', () => ({
  collectDueReminders: jest.fn(),
}));

jest.mock('../src/services/reminderPolicyService', () => ({
  checkUserReminderPermission: jest.fn(),
}));

jest.mock('../src/services/reminderNotificationService', () => ({
  sendFirstReminder: jest.fn(),
  sendSecondReminder: jest.fn(),
}));

jest.mock('../src/models/medicationLogModel', () => ({
  listPendingForSecondReminder: jest.fn(),
  listPendingForMissed: jest.fn(),
  markMissed: jest.fn(),
}));

jest.mock('../src/models/medicationPlanModel', () => ({
  getById: jest.fn(),
}));

jest.mock('../src/services/familyNotificationService', () => ({
  notifyMissedMedication: jest.fn(),
}));

const reminderScheduleService = require('../src/services/reminderScheduleService');
const reminderPolicyService = require('../src/services/reminderPolicyService');
const reminderNotificationService = require('../src/services/reminderNotificationService');
const medicationLogModel = require('../src/models/medicationLogModel');
const medicationPlanModel = require('../src/models/medicationPlanModel');
const familyNotificationService = require('../src/services/familyNotificationService');

const medicationReminderJob = require('../src/jobs/medicationReminderJob');
const medicationFollowupJob = require('../src/jobs/medicationFollowupJob');

describe('用药提醒与跟进任务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('每分钟提醒任务：命中后发送首提醒', async () => {
    reminderScheduleService.collectDueReminders.mockResolvedValue({
      total: 2,
      items: [
        {
          plan: { id: 1, user_id: 1001, medication_name: '降压药', dosage: '1片' },
          log: { id: 10, scheduled_time: '2026-02-21 08:00:00' },
        },
        {
          plan: { id: 2, user_id: 1002, medication_name: '维生素', dosage: '2粒' },
          log: { id: 11, scheduled_time: '2026-02-21 08:00:00' },
        },
      ],
    });

    reminderPolicyService.checkUserReminderPermission
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });

    reminderNotificationService.sendFirstReminder.mockResolvedValue({ success: true });

    const result = await medicationReminderJob.runOnce(new Date('2026-02-21T08:00:00'));

    expect(result.total).toBe(2);
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(reminderNotificationService.sendFirstReminder).toHaveBeenCalledTimes(1);
  });

  it('每5分钟跟进任务：发送二次提醒并处理 miss', async () => {
    medicationLogModel.listPendingForSecondReminder.mockResolvedValue([
      {
        id: 20,
        user_id: 1001,
        plan_id: 1,
        medication_name: '降压药',
        dosage: '1片',
        scheduled_time: '2026-02-21 08:00:00',
      },
    ]);

    medicationLogModel.listPendingForMissed.mockResolvedValue([
      {
        id: 21,
        user_id: 1001,
        plan_id: 1,
        medication_name: '降压药',
        dosage: '1片',
        scheduled_time: '2026-02-21 06:00:00',
      },
    ]);

    medicationPlanModel.getById.mockResolvedValue({
      id: 1,
      user_id: 1001,
      medication_name: '降压药',
      dosage: '1片',
    });

    reminderPolicyService.checkUserReminderPermission.mockResolvedValue({ allowed: true });
    reminderNotificationService.sendSecondReminder.mockResolvedValue({ success: true });
    medicationLogModel.markMissed.mockResolvedValue(1);
    familyNotificationService.notifyMissedMedication.mockResolvedValue({ success: true, skipped: false });

    const result = await medicationFollowupJob.runOnce(new Date('2026-02-21T10:05:00'));

    expect(result.second_total).toBe(1);
    expect(result.second_sent).toBe(1);
    expect(result.marked_missed).toBe(1);
    expect(result.family_notified).toBe(1);
    expect(reminderNotificationService.sendSecondReminder).toHaveBeenCalledTimes(1);
    expect(familyNotificationService.notifyMissedMedication).toHaveBeenCalledTimes(1);
  });
});
