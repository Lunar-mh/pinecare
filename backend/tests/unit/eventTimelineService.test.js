'use strict';

jest.mock('../../src/models/auditLog', () => ({
  create: jest.fn(),
}));

const AuditLogModel = require('../../src/models/auditLog');
const {
  buildFallDeliverySummary,
  buildSosDeliverySummary,
  buildUnifiedTimeline,
  recordCareEvent,
} = require('../../src/services/eventTimelineService');

describe('eventTimelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLogModel.create.mockResolvedValue(1);
  });

  it('records care events into audit log safely', async () => {
    await recordCareEvent('sos.triggered', {
      userId: 7,
      entityType: 'sos',
      entityId: 101,
      status: 'triggered',
      occurredAt: '2026-03-11T10:00:00.000Z',
      details: { latitude: 30.1 },
    });

    expect(AuditLogModel.create).toHaveBeenCalledWith({
      userId: 7,
      action: 'sos.triggered',
      details: {
        entityType: 'sos',
        entityId: 101,
        status: 'triggered',
        occurredAt: '2026-03-11T10:00:00.000Z',
        latitude: 30.1,
      },
    });
  });

  it('builds delivery summaries and unified timeline', () => {
    const sosSummary = buildSosDeliverySummary([
      { sos_event_id: 1, notify_type: 'wechat', pending_count: 0, sent_count: 1, failed_count: 1 },
      { sos_event_id: 1, notify_type: 'sms', pending_count: 1, sent_count: 0, failed_count: 0 },
    ]);
    expect(sosSummary.get(1)).toEqual({
      wechat: { pending: 0, sent: 1, failed: 1 },
      sms: { pending: 1, sent: 0, failed: 0 },
      total: { pending: 1, sent: 1, failed: 1 },
    });

    expect(
      buildFallDeliverySummary([
        { status: 'pending' },
        { status: 'sent' },
        { status: 'failed' },
      ])
    ).toEqual({ pending: 1, sent: 1, failed: 1, total: 3 });

    const timeline = buildUnifiedTimeline({
      startDate: new Date('2026-03-11T00:00:00.000Z'),
      endDate: new Date('2026-03-11T23:59:59.000Z'),
      locations: [{ id: 9, createdAt: '2026-03-11T10:00:00.000Z' }],
      sosEvents: [{ id: 1, event_status: 'confirmed', created_at: '2026-03-11T10:05:00.000Z', updated_at: '2026-03-11T10:06:00.000Z' }],
      sosSummaryRows: [
        { sos_event_id: 1, notify_type: 'wechat', pending_count: 0, sent_count: 1, failed_count: 1 },
      ],
      fallEvents: [{ id: 2, status: 'confirmed', detectedAt: '2026-03-11T10:07:00.000Z' }],
      fallNotificationsByEvent: {
        2: [{ status: 'sent' }, { status: 'failed' }],
      },
      auditLogs: [
        { action: 'sos.confirmed', createdAt: '2026-03-11T10:08:00.000Z', details: { entityType: 'sos' } },
        { action: 'ignored.action', createdAt: '2026-03-11T10:09:00.000Z', details: {} },
      ],
    });

    expect(timeline).toHaveLength(4);
    expect(timeline[0]).toMatchObject({ type: 'audit', title: 'sos.confirmed' });
    expect(timeline[1]).toMatchObject({ type: 'fall', delivery: { failed: 1, total: 2 } });
    expect(timeline[2]).toMatchObject({ type: 'sos', delivery: { total: { failed: 1, sent: 1, pending: 0 } } });
    expect(timeline[3]).toMatchObject({ type: 'gps' });
  });
});
