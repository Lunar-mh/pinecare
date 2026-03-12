'use strict';

jest.mock('../../src/models/auditLog', () => ({
  list: jest.fn(),
}));

jest.mock('../../src/models/sosEvent', () => ({
  listByUser: jest.fn(),
}));

jest.mock('../../src/models/sosNotification', () => ({
  summarizeByEventIds: jest.fn(),
}));

jest.mock('../../src/models/fall', () => ({
  listHistory: jest.fn(),
  findNotificationsByEventIds: jest.fn(),
}));

jest.mock('../../src/models/locationRecordModel', () => ({
  getByTimeRange: jest.fn(),
}));

const AuditLogModel = require('../../src/models/auditLog');
const SosEventModel = require('../../src/models/sosEvent');
const SosNotificationModel = require('../../src/models/sosNotification');
const FallModel = require('../../src/models/fall');
const locationRecordModel = require('../../src/models/locationRecordModel');
const {
  getEventReplay,
  clearEventReplayCache,
} = require('../../src/services/adminOps/eventReplayService');

describe('admin event replay service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearEventReplayCache();
  });

  it('builds unified replay timeline with delivery summaries and active incident counts', async () => {
    locationRecordModel.getByTimeRange.mockResolvedValueOnce([
      { id: 10, createdAt: '2026-03-11T10:00:00.000Z', latitude: 30.1, longitude: 120.1 },
    ]);
    SosEventModel.listByUser.mockResolvedValueOnce([
      { id: 20, event_status: 'confirmed', created_at: '2026-03-11T10:01:00.000Z', updated_at: '2026-03-11T10:02:00.000Z' },
    ]);
    FallModel.listHistory.mockResolvedValueOnce([
      { id: 30, status: 'confirmed', detectedAt: '2026-03-11T10:03:00.000Z' },
    ]);
    AuditLogModel.list.mockResolvedValueOnce([
      { id: 40, action: 'location.upload', createdAt: '2026-03-11T10:04:00.000Z', details: { entityType: 'location' } },
      { id: 41, action: 'misc.ignored', createdAt: '2026-03-11T10:05:00.000Z', details: {} },
    ]);
    SosNotificationModel.summarizeByEventIds.mockResolvedValueOnce([
      { sos_event_id: 20, notify_type: 'wechat', pending_count: 0, sent_count: 1, failed_count: 1 },
    ]);
    FallModel.findNotificationsByEventIds.mockResolvedValueOnce({
      30: [{ status: 'sent' }, { status: 'failed' }],
    });

    const result = await getEventReplay({
      userId: '7',
      startDate: '2026-03-11T00:00:00.000Z',
      endDate: '2026-03-11T23:59:59.000Z',
    });

    expect(result.summary).toMatchObject({
      gpsPoints: 1,
      sosEvents: 1,
      fallEvents: 1,
      auditLogs: 2,
      activeIncidents: 2,
      deliveryFailures: 2,
      totalTimelineItems: 4,
    });
    expect(result.timeline[0]).toMatchObject({ type: 'audit', title: 'location.upload' });
    expect(FallModel.findNotificationsByEventIds).toHaveBeenCalledWith([30]);
    expect(result.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'sos',
          delivery: expect.objectContaining({
            total: expect.objectContaining({ failed: 1, sent: 1, pending: 0 }),
          }),
        }),
        expect.objectContaining({
          type: 'fall',
          delivery: expect.objectContaining({ failed: 1, total: 2 }),
        }),
      ])
    );
  });

  it('caches repeated replay queries within the TTL window', async () => {
    locationRecordModel.getByTimeRange.mockResolvedValue([{ id: 10, createdAt: '2026-03-11T10:00:00.000Z' }]);
    SosEventModel.listByUser.mockResolvedValue([]);
    FallModel.listHistory.mockResolvedValue([]);
    AuditLogModel.list.mockResolvedValue([]);
    SosNotificationModel.summarizeByEventIds.mockResolvedValue([]);
    FallModel.findNotificationsByEventIds.mockResolvedValue({});

    const query = {
      userId: '7',
      startDate: '2026-03-11T00:00:00.000Z',
      endDate: '2026-03-11T23:59:59.000Z',
    };

    const first = await getEventReplay(query);
    const second = await getEventReplay(query);

    expect(first).toEqual(second);
    expect(locationRecordModel.getByTimeRange).toHaveBeenCalledTimes(1);
    expect(SosEventModel.listByUser).toHaveBeenCalledTimes(1);

    clearEventReplayCache();
    await getEventReplay(query);

    expect(locationRecordModel.getByTimeRange).toHaveBeenCalledTimes(2);
  });
});
