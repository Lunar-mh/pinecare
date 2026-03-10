'use strict';

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../src/models/medicationLogModel', () => ({
  markFamilyNotified: jest.fn(),
}));

jest.mock('../src/models/reminderQueueModel', () => ({
  createTask: jest.fn(),
  markSent: jest.fn(),
  markFailed: jest.fn(),
}));

jest.mock('../src/services/medicationSettingService', () => ({
  getSettings: jest.fn(),
}));

jest.mock('../src/utils/wechatNotifier', () => ({
  sendFamilyMissedReminder: jest.fn(),
  sendRefillReminder: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  set: jest.fn(),
}));

jest.mock('../src/models/medicationPlanModel', () => ({
  listRefillCandidates: jest.fn(),
}));

const { query } = require('../src/config/database');
const medicationLogModel = require('../src/models/medicationLogModel');
const reminderQueueModel = require('../src/models/reminderQueueModel');
const medicationSettingService = require('../src/services/medicationSettingService');
const wechatNotifier = require('../src/utils/wechatNotifier');
const redis = require('../src/config/redis');
const medicationPlanModel = require('../src/models/medicationPlanModel');

const familyNotificationService = require('../src/services/familyNotificationService');
const refillReminderService = require('../src/services/refillReminderService');

describe('家属同步与续药任务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('家属同步开启且存在家属时发送通知', async () => {
    medicationSettingService.getSettings.mockResolvedValue({ family_sync_enabled: 1 });
    query.mockResolvedValue([[{ family_user_id: 2001 }]]);
    reminderQueueModel.createTask.mockResolvedValue({ id: 11 });
    reminderQueueModel.markSent.mockResolvedValue(1);
    medicationLogModel.markFamilyNotified.mockResolvedValue(1);
    wechatNotifier.sendFamilyMissedReminder.mockResolvedValue({ msgid: 'm1' });

    const result = await familyNotificationService.notifyMissedMedication(
      {
        id: 100,
        user_id: 1001,
        plan_id: 1,
        medication_name: '降压药',
        scheduled_time: '2026-02-21 06:00:00',
      },
      {
        id: 1,
        medication_name: '降压药',
      }
    );

    expect(result.success).toBe(true);
    expect(result.success_count).toBe(1);
    expect(reminderQueueModel.markSent).toHaveBeenCalledWith(11);
  });

  it('续药任务命中阈值时发送提醒', async () => {
    medicationPlanModel.listRefillCandidates.mockResolvedValue([
      {
        id: 1,
        user_id: 1001,
        medication_name: '降压药',
        remaining_quantity: 2,
        reminder_threshold: 3,
      },
    ]);

    redis.set.mockResolvedValue('OK');
    medicationSettingService.getSettings.mockResolvedValue({ reminder_enabled: 1 });
    reminderQueueModel.createTask.mockResolvedValue({ id: 21 });
    reminderQueueModel.markSent.mockResolvedValue(1);
    wechatNotifier.sendRefillReminder.mockResolvedValue({ msgid: 'm2' });

    const result = await refillReminderService.runDaily(new Date('2026-02-21T09:00:00'));

    expect(result.total).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(wechatNotifier.sendRefillReminder).toHaveBeenCalledTimes(1);
  });
});
