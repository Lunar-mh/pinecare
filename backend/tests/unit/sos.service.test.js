'use strict';

jest.mock('../../src/models/sosEvent', () => ({
  createEvent: jest.fn(),
  findByIdAndUser: jest.fn(),
  transitionStatus: jest.fn(),
  countByUser: jest.fn(),
  listByUser: jest.fn(),
  autoResolveTimeoutEvents: jest.fn(),
}));

jest.mock('../../src/models/sosNotification', () => ({
  summarizeByEventIds: jest.fn(),
}));

jest.mock('../../src/services/sosNotificationService', () => ({
  createAndDispatch: jest.fn(),
}));

const SosEventModel = require('../../src/models/sosEvent');
const sosNotificationService = require('../../src/services/sosNotificationService');
const sosService = require('../../src/services/sosService');

describe('SOS 服务单元测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('触发 SOS 成功', async () => {
    SosEventModel.createEvent.mockResolvedValue({
      id: 101,
      user_id: 2001,
      event_status: 'triggered',
      created_at: '2026-02-21 10:00:00',
      address: '测试地址',
      latitude: 30.1,
      longitude: 120.1,
    });
    sosNotificationService.createAndDispatch.mockResolvedValue({ queued: 2 });

    const result = await sosService.triggerSos(2001, {
      latitude: 30.1,
      longitude: 120.1,
      address: '测试地址',
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(result).toEqual({ event_id: 101, event_status: 'triggered' });
    expect(SosEventModel.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2001,
        latitude: 30.1,
        longitude: 120.1,
      })
    );
    expect(sosNotificationService.createAndDispatch).toHaveBeenCalled();
  });

  test('5 秒内取消成功', async () => {
    SosEventModel.findByIdAndUser.mockResolvedValue({
      id: 102,
      user_id: 2001,
      event_status: 'triggered',
      created_at: new Date(Date.now() - 2000).toISOString(),
    });
    SosEventModel.transitionStatus.mockResolvedValue(true);

    const result = await sosService.cancelSos(2001, 102);

    expect(result).toEqual({ event_id: 102, event_status: 'cancelled' });
    expect(SosEventModel.transitionStatus).toHaveBeenCalledWith(102, 2001, 'triggered', 'cancelled');
  });

  test('超过 5 秒取消失败', async () => {
    SosEventModel.findByIdAndUser.mockResolvedValue({
      id: 103,
      user_id: 2001,
      event_status: 'triggered',
      created_at: new Date(Date.now() - 7000).toISOString(),
    });

    await expect(sosService.cancelSos(2001, 103)).rejects.toMatchObject({
      code: 408,
      statusCode: 408,
      message: '取消窗口已超时',
    });
  });

  test('重复取消失败', async () => {
    SosEventModel.findByIdAndUser.mockResolvedValue({
      id: 104,
      user_id: 2001,
      event_status: 'cancelled',
      created_at: new Date().toISOString(),
    });

    await expect(sosService.cancelSos(2001, 104)).rejects.toMatchObject({
      code: 409,
      statusCode: 409,
    });

    expect(SosEventModel.transitionStatus).not.toHaveBeenCalled();
  });
});
