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

jest.mock('../../src/services/sosQueueService', () => ({
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
}));

const SosEventModel = require('../../src/models/sosEvent');
const sosQueueService = require('../../src/services/sosQueueService');
const sosService = require('../../src/services/sosService');
const sosAutoResolveJob = require('../../src/jobs/sosAutoResolveJob');

describe('SOS 状态流转与自动解决集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('手动流转：triggered -> confirmed -> resolved', async () => {
    SosEventModel.findByIdAndUser
      .mockResolvedValueOnce({ id: 301, user_id: 9001, event_status: 'triggered' })
      .mockResolvedValueOnce({ id: 301, user_id: 9001, event_status: 'confirmed' });
    SosEventModel.transitionStatus.mockResolvedValue(true);

    const confirmed = await sosService.confirmSos(9001, 301);
    const resolved = await sosService.resolveSos(9001, 301);

    expect(confirmed).toEqual({ event_id: 301, event_status: 'confirmed' });
    expect(resolved).toEqual({ event_id: 301, event_status: 'resolved' });
    expect(SosEventModel.transitionStatus).toHaveBeenNthCalledWith(1, 301, 9001, 'triggered', 'confirmed');
    expect(SosEventModel.transitionStatus).toHaveBeenNthCalledWith(2, 301, 9001, 'confirmed', 'resolved');
  });

  test('非法流转：triggered 不能直接 resolved', async () => {
    SosEventModel.findByIdAndUser.mockResolvedValue({ id: 302, user_id: 9001, event_status: 'triggered' });

    await expect(sosService.resolveSos(9001, 302)).rejects.toMatchObject({
      code: 409,
      statusCode: 409,
    });

    expect(SosEventModel.transitionStatus).not.toHaveBeenCalled();
  });

  test('自动解决任务应加锁并更新超时事件', async () => {
    SosEventModel.autoResolveTimeoutEvents.mockResolvedValue(3);
    sosQueueService.acquireLock.mockResolvedValue('lock-token');
    sosQueueService.releaseLock.mockResolvedValue(true);

    const result = await sosAutoResolveJob.runAutoResolveOnce();

    expect(result).toEqual({ resolved_count: 3 });
    expect(sosQueueService.acquireLock).toHaveBeenCalled();
    expect(SosEventModel.autoResolveTimeoutEvents).toHaveBeenCalled();
    expect(sosQueueService.releaseLock).toHaveBeenCalledWith(expect.any(String), 'lock-token');
  });
});
