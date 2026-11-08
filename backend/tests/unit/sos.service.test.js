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

jest.mock('../../src/services/eventTimelineService', () => ({
  recordCareEvent: jest.fn().mockResolvedValue(undefined),
}));

const SosEventModel = require('../../src/models/sosEvent');
const sosNotificationService = require('../../src/services/sosNotificationService');
const { recordCareEvent } = require('../../src/services/eventTimelineService');
const sosService = require('../../src/services/sosService');

describe('sosService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('triggers sos and records unified audit', async () => {
    SosEventModel.createEvent.mockResolvedValue({
      id: 101,
      user_id: 2001,
      event_status: 'triggered',
      created_at: '2026-02-21T10:00:00.000Z',
      address: 'community center',
      latitude: 30.1,
      longitude: 120.1,
    });
    sosNotificationService.createAndDispatch.mockResolvedValue({ queued: 2 });

    const result = await sosService.triggerSos(2001, {
      latitude: 30.1,
      longitude: 120.1,
      address: 'community center',
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(result).toEqual({ event_id: 101, event_status: 'triggered' });
    expect(recordCareEvent).toHaveBeenCalledWith(
      'sos.triggered',
      expect.objectContaining({
        userId: 2001,
        entityId: 101,
        status: 'triggered',
      })
    );
    expect(sosNotificationService.createAndDispatch).toHaveBeenCalled();
  });

  test('cancels triggered events within timeout and records audit', async () => {
    SosEventModel.findByIdAndUser.mockResolvedValue({
      id: 102,
      user_id: 2001,
      event_status: 'triggered',
      created_at: new Date(Date.now() - 2000).toISOString(),
    });
    SosEventModel.transitionStatus.mockResolvedValue(true);

    const result = await sosService.cancelSos(2001, 102);

    expect(result).toEqual({ event_id: 102, event_status: 'cancelled' });
    expect(SosEventModel.transitionStatus).toHaveBeenCalledWith(
      102,
      2001,
      'triggered',
      'cancelled',
      expect.anything()
    );
    expect(recordCareEvent).toHaveBeenCalledWith(
      'sos.cancelled',
      expect.objectContaining({ entityId: 102, status: 'cancelled' })
    );
  });

  test('rejects cancellation after timeout', async () => {
    SosEventModel.findByIdAndUser.mockResolvedValue({
      id: 103,
      user_id: 2001,
      event_status: 'triggered',
      created_at: new Date(Date.now() - 7000).toISOString(),
    });

    await expect(sosService.cancelSos(2001, 103)).rejects.toMatchObject({
      code: 408,
      statusCode: 408,
    });
  });

  test('rejects cancellation when status is not triggered', async () => {
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
