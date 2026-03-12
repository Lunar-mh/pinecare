'use strict';

const SosEventModel = require('../../models/sosEvent');
const SosNotificationModel = require('../../models/sosNotification');
const { ensureUserId, formatNotificationSummary, toIsoText } = require('./shared');

async function getHistory(userId, params = {}) {
  const currentUserId = ensureUserId(userId);
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.page_size || params.pageSize) || 10));
  const status = params.status ? String(params.status) : null;

  const [total, list] = await Promise.all([
    SosEventModel.countByUser(currentUserId, status),
    SosEventModel.listByUser(currentUserId, { page, pageSize, status }),
  ]);

  const eventIds = list.map((item) => item.id);
  const summaryRows = await SosNotificationModel.summarizeByEventIds(eventIds);
  const summaryMap = formatNotificationSummary(summaryRows);

  return {
    list: list.map((item) => ({
      eventId: item.id,
      eventStatus: item.event_status,
      triggerType: item.trigger_type,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
      createdAt: toIsoText(item.created_at),
      confirmedAt: toIsoText(item.confirmed_at),
      resolvedAt: toIsoText(item.resolved_at),
      cancelledAt: toIsoText(item.cancelled_at),
      latestStatusChangedAt:
        toIsoText(item.cancelled_at) ||
        toIsoText(item.resolved_at) ||
        toIsoText(item.confirmed_at) ||
        toIsoText(item.created_at),
      notificationSummary: summaryMap[item.id] || {
        wechat: { pending: 0, sent: 0, failed: 0 },
        sms: { pending: 0, sent: 0, failed: 0 },
        total: { pending: 0, sent: 0, failed: 0 },
      },
      auditTrailSummary: {
        currentStatus: item.event_status,
        triggeredAt: toIsoText(item.created_at),
        confirmedAt: toIsoText(item.confirmed_at),
        resolvedAt: toIsoText(item.resolved_at),
        cancelledAt: toIsoText(item.cancelled_at),
      },
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function autoResolveTimeoutEvents(timeoutMinutes) {
  const affectedRows = await SosEventModel.autoResolveTimeoutEvents(timeoutMinutes);
  return { resolved_count: affectedRows };
}

module.exports = {
  getHistory,
  autoResolveTimeoutEvents,
};
