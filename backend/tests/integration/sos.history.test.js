'use strict';

jest.mock('../../src/models/sosEvent', () => ({
  countByUser: jest.fn(),
  listByUser: jest.fn(),
  findByIdAndUser: jest.fn(),
  transitionStatus: jest.fn(),
  createEvent: jest.fn(),
  autoResolveTimeoutEvents: jest.fn(),
}));

jest.mock('../../src/models/sosNotification', () => ({
  summarizeByEventIds: jest.fn(),
}));

jest.mock('../../src/services/sosNotificationService', () => ({
  createAndDispatch: jest.fn(),
}));

const SosEventModel = require('../../src/models/sosEvent');
const SosNotificationModel = require('../../src/models/sosNotification');
const sosService = require('../../src/services/sosService');

describe('SOS 历史查询集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应按分页与状态过滤返回历史，并包含通知摘要', async () => {
    SosEventModel.countByUser.mockResolvedValue(2);
    SosEventModel.listByUser.mockResolvedValue([
      {
        id: 21,
        user_id: 7001,
        event_status: 'resolved',
        trigger_type: 'manual',
        latitude: 30.1,
        longitude: 120.1,
        address: 'A 地址',
        created_at: '2026-02-21 10:00:00',
        confirmed_at: '2026-02-21 10:01:00',
        resolved_at: '2026-02-21 10:03:00',
        cancelled_at: null,
      },
      {
        id: 20,
        user_id: 7001,
        event_status: 'resolved',
        trigger_type: 'manual',
        latitude: 30.2,
        longitude: 120.2,
        address: 'B 地址',
        created_at: '2026-02-21 09:00:00',
        confirmed_at: '2026-02-21 09:01:00',
        resolved_at: '2026-02-21 09:03:00',
        cancelled_at: null,
      },
    ]);
    SosNotificationModel.summarizeByEventIds.mockResolvedValue([
      { sos_event_id: 21, notify_type: 'wechat', pending_count: 0, sent_count: 1, failed_count: 0 },
      { sos_event_id: 21, notify_type: 'sms', pending_count: 0, sent_count: 1, failed_count: 0 },
      { sos_event_id: 20, notify_type: 'wechat', pending_count: 0, sent_count: 1, failed_count: 0 },
      { sos_event_id: 20, notify_type: 'sms', pending_count: 0, sent_count: 0, failed_count: 1 },
    ]);

    const result = await sosService.getHistory(7001, {
      page: 1,
      page_size: 2,
      status: 'resolved',
    });

    expect(SosEventModel.listByUser).toHaveBeenCalledWith(7001, {
      page: 1,
      pageSize: 2,
      status: 'resolved',
    });
    expect(result.pagination).toEqual({
      page: 1,
      page_size: 2,
      total: 2,
      total_pages: 1,
    });
    expect(result.list[0].event_id).toBe(21);
    expect(result.list[1].event_id).toBe(20);
    expect(result.list[0].notification_summary.total.sent).toBe(2);
    expect(result.list[1].notification_summary.total.failed).toBe(1);
  });

  test('应只按当前用户查询，保证用户隔离', async () => {
    SosEventModel.countByUser.mockResolvedValue(0);
    SosEventModel.listByUser.mockResolvedValue([]);
    SosNotificationModel.summarizeByEventIds.mockResolvedValue([]);

    await sosService.getHistory(8001, { page: 1, page_size: 10 });

    expect(SosEventModel.countByUser).toHaveBeenCalledWith(8001, null);
    expect(SosEventModel.listByUser).toHaveBeenCalledWith(8001, {
      page: 1,
      pageSize: 10,
      status: null,
    });
  });
});
