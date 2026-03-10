'use strict';

jest.mock('../../src/config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../../src/models/fall', () => ({
  findEventById: jest.fn(),
  markConfirmed: jest.fn(),
  getNotificationContacts: jest.fn(),
  createNotificationRecords: jest.fn(),
  findNotificationsByEventId: jest.fn(),
  updateNotificationStatus: jest.fn(),
  findExpiredDetectingEvents: jest.fn(),
  getSensitivitySetting: jest.fn(),
  upsertSensitivitySetting: jest.fn(),
  countHistory: jest.fn(),
  listHistory: jest.fn(),
  createFalseAlarmEvent: jest.fn(),
  createDetectingEvent: jest.fn(),
  findEventByIdAndUser: jest.fn(),
  markCancelled: jest.fn(),
}));

jest.mock('../../src/services/notificationService', () => ({
  sendWechat: jest.fn(),
  sendSms: jest.fn(),
}));

const redis = require('../../src/config/redis');
const FallModel = require('../../src/models/fall');
const notificationService = require('../../src/services/notificationService');
const fallService = require('../../src/services/fallService');

describe('倒计时到期自动通知集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应完成 detecting -> confirmed 并写入通知状态', async () => {
    FallModel.findEventById
      .mockResolvedValueOnce({
        id: 99,
        userId: 2001,
        status: 'detecting',
        detectedAt: '2026-02-20 10:00:00',
        sensitivity: 'medium',
      })
      .mockResolvedValueOnce({
        id: 99,
        userId: 2001,
        status: 'confirmed',
        detectedAt: '2026-02-20 10:00:00',
        sensitivity: 'medium',
      });
    FallModel.markConfirmed.mockResolvedValue(true);
    FallModel.getNotificationContacts.mockResolvedValue([
      {
        contactId: 1,
        contactType: 'family',
        notifyMethod: 'wechat',
        wechatOpenId: 'openid-1',
      },
    ]);
    FallModel.createNotificationRecords.mockResolvedValue();
    FallModel.findNotificationsByEventId.mockResolvedValue([
      { id: 501, contactId: 1, notifyMethod: 'wechat' },
    ]);
    FallModel.updateNotificationStatus.mockResolvedValue();
    notificationService.sendWechat.mockResolvedValue();

    const result = await fallService.processPendingFall(99);

    expect(result.processed).toBe(true);
    expect(result.notification).toMatchObject({ total: 1, sent: 1, failed: 0 });
    expect(FallModel.markConfirmed).toHaveBeenCalledWith(99);
    expect(redis.del).toHaveBeenCalledWith('fall:timer:99');
    expect(FallModel.createNotificationRecords).toHaveBeenCalledWith(99, expect.any(Array));
    expect(FallModel.updateNotificationStatus).toHaveBeenCalledWith(501, 'sent');
  });
});
