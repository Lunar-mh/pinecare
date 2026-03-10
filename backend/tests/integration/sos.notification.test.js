'use strict';

jest.mock('../../src/config/redis', () => ({
  status: 'ready',
  connect: jest.fn(),
  set: jest.fn(async () => 'OK'),
}));

jest.mock('../../src/models/emergencyContact', () => ({
  listByUserId: jest.fn(),
}));

jest.mock('../../src/models/sosNotification', () => ({
  batchCreate: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock('../../src/services/sosQueueService', () => ({
  enqueueBatch: jest.fn(),
  requeue: jest.fn(),
}));

jest.mock('../../src/services/wechatNotifyService', () => ({
  sendWechatNotification: jest.fn(),
}));

jest.mock('../../src/services/smsNotifyService', () => ({
  sendSmsNotification: jest.fn(),
}));

const EmergencyContactModel = require('../../src/models/emergencyContact');
const SosNotificationModel = require('../../src/models/sosNotification');
const sosQueueService = require('../../src/services/sosQueueService');
const wechatNotifyService = require('../../src/services/wechatNotifyService');
const smsNotifyService = require('../../src/services/smsNotifyService');
const sosNotificationService = require('../../src/services/sosNotificationService');

describe('SOS 通知集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应为每个联系人并行生成微信+短信通知并入队', async () => {
    EmergencyContactModel.listByUserId.mockResolvedValue([
      { id: 1, name: '家属A', phone: '13800001111', wechat_openid: 'openid-a' },
      { id: 2, name: '家属B', phone: '13800002222', wechat_openid: 'openid-b' },
    ]);
    SosNotificationModel.batchCreate.mockResolvedValue([1001, 1002, 1003, 1004]);

    const event = {
      id: 88,
      user_id: 9001,
      address: '杭州市西湖区',
      latitude: 30.1,
      longitude: 120.1,
      created_at: '2026-02-21 10:00:00',
    };

    const result = await sosNotificationService.createAndDispatch(event);

    expect(result).toEqual({
      contacts_total: 2,
      notifications_total: 4,
      queued: 4,
    });
    expect(SosNotificationModel.batchCreate).toHaveBeenCalledTimes(1);
    expect(sosQueueService.enqueueBatch).toHaveBeenCalledTimes(1);

    const records = SosNotificationModel.batchCreate.mock.calls[0][0];
    expect(records).toHaveLength(4);
    const notifyTypes = records.map((item) => item.notify_type).sort();
    expect(notifyTypes).toEqual(['sms', 'sms', 'wechat', 'wechat']);
  });

  test('通道失败应回写 failed 并进入重试', async () => {
    SosNotificationModel.findById.mockResolvedValue({ id: 1001, status: 'pending' });
    SosNotificationModel.updateStatus.mockResolvedValue();

    wechatNotifyService.sendWechatNotification.mockRejectedValue(new Error('微信通道故障'));

    const task = {
      notification_id: 1001,
      sos_event_id: 88,
      contact_name: '家属A',
      notify_type: 'wechat',
      notify_target: 'openid-a',
      retry_count: 0,
      event_snapshot: {
        address: '杭州市西湖区',
        latitude: 30.1,
        longitude: 120.1,
        triggered_at: '2026-02-21 10:00:00',
      },
    };

    const result = await sosNotificationService.consumeTask(task);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('send-failed');
    expect(SosNotificationModel.updateStatus).toHaveBeenCalledWith(1001, 'failed', expect.any(Object));
    expect(sosQueueService.requeue).toHaveBeenCalledWith(expect.objectContaining({ retry_count: 1 }));
    expect(smsNotifyService.sendSmsNotification).not.toHaveBeenCalled();
  });
});
