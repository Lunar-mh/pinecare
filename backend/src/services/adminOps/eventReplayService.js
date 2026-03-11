'use strict';

const AuditLogModel = require('../../models/auditLog');
const SosEventModel = require('../../models/sosEvent');
const SosNotificationModel = require('../../models/sosNotification');
const FallModel = require('../../models/fall');
const locationRecordModel = require('../../models/locationRecordModel');
const { buildUnifiedTimeline } = require('../eventTimelineService');
const { createBizError, parseDate, parsePositiveInt } = require('./shared');

function compactReplayDelivery(item) {
  if (!item.delivery) {
    return item;
  }

  if (item.type === 'fall') {
    return {
      ...item,
      delivery: {
        failed: Number(item.delivery.failed) || 0,
        total: Number(item.delivery.total) || 0,
      },
    };
  }

  if (item.type === 'sos' && item.delivery.total) {
    return {
      ...item,
      delivery: { total: item.delivery.total },
    };
  }

  return item;
}

async function getEventReplay(query = {}) {
  const userId = parsePositiveInt(query.userId, 'userId');
  const endDate = query.endDate ? parseDate(query.endDate, 'endDate') : new Date();
  const startDate = query.startDate
    ? parseDate(query.startDate, 'startDate')
    : new Date(endDate.getTime() - 48 * 60 * 60 * 1000);

  if (endDate.getTime() < startDate.getTime()) {
    throw createBizError(400, 'endDate must not be earlier than startDate.', 400);
  }

  const locationLimit = Math.min(Math.max(Number(query.locationLimit) || 200, 1), 1000);
  const auditLimit = Math.min(Math.max(Number(query.auditLimit) || 50, 1), 200);

  const [locations, sosEvents, fallEvents, auditLogs] = await Promise.all([
    locationRecordModel.getByTimeRange(userId, startDate, endDate, locationLimit),
    SosEventModel.listByUser(userId, { page: 1, pageSize: 50 }),
    FallModel.listHistory(userId, { page: 1, pageSize: 50 }),
    AuditLogModel.list({ userId }, { page: 1, pageSize: auditLimit }),
  ]);

  const sosSummaryRows = await SosNotificationModel.summarizeByEventIds(
    sosEvents.map((item) => Number(item.id)).filter(Boolean)
  );
  const fallNotificationsByEvent = {};
  await Promise.all(
    fallEvents.map(async (item) => {
      fallNotificationsByEvent[item.id] = await FallModel.findNotificationsByEventId(item.id);
    })
  );

  const timeline = buildUnifiedTimeline({
    startDate,
    endDate,
    locations,
    sosEvents,
    sosSummaryRows,
    fallEvents,
    fallNotificationsByEvent,
    auditLogs,
  }).map(compactReplayDelivery);

  const activeIncidents = timeline.filter(
    (item) =>
      (item.type === 'sos' && ['triggered', 'confirmed'].includes(item.payload.event_status)) ||
      (item.type === 'fall' && item.payload.status === 'confirmed')
  ).length;
  const deliveryFailures = timeline.reduce((sum, item) => {
    if (!item.delivery) {
      return sum;
    }
    if (item.delivery.total && typeof item.delivery.total.failed === 'number') {
      return sum + item.delivery.total.failed;
    }
    return sum + (item.delivery.failed || 0);
  }, 0);

  return {
    userId,
    range: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      gpsPoints: locations.length,
      sosEvents: sosEvents.length,
      fallEvents: fallEvents.length,
      auditLogs: auditLogs.length,
      activeIncidents,
      deliveryFailures,
      totalTimelineItems: timeline.length,
    },
    recommendations: [
      activeIncidents > 0
        ? 'Active SOS or fall incidents exist in the replay window. Verify resolution and caregiver follow-up.'
        : 'No active SOS or fall incident remains in the replay window.',
      deliveryFailures > 0
        ? 'Notification delivery failures were detected. Review SMS and WeChat retry outcomes.'
        : 'No delivery failure was detected in the replay window.',
    ],
    timeline,
  };
}

module.exports = {
  getEventReplay,
};

