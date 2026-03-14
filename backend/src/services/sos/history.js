'use strict';

const SosEventModel = require('../../models/sosEvent');
const SosNotificationModel = require('../../models/sosNotification');
const {
  ensureUserId,
  ensureEventId,
  formatNotificationSummary,
  toIsoText,
  createSosError,
  SOS_ERROR_CODES,
  SOS_ERROR_MESSAGES,
} = require('./shared');

function buildEventPayload(item, summary) {
  const createdAt = toIsoText(item.created_at);
  const confirmedAt = toIsoText(item.confirmed_at);
  const resolvedAt = toIsoText(item.resolved_at);
  const cancelledAt = toIsoText(item.cancelled_at);

  return {
    eventId: item.id,
    event_id: item.id,
    eventStatus: item.event_status,
    event_status: item.event_status,
    triggerType: item.trigger_type,
    trigger_type: item.trigger_type,
    latitude: item.latitude,
    longitude: item.longitude,
    address: item.address,
    createdAt,
    created_at: createdAt,
    confirmedAt,
    confirmed_at: confirmedAt,
    resolvedAt,
    resolved_at: resolvedAt,
    cancelledAt,
    cancelled_at: cancelledAt,
    latestStatusChangedAt: cancelledAt || resolvedAt || confirmedAt || createdAt,
    latest_status_changed_at: cancelledAt || resolvedAt || confirmedAt || createdAt,
    notificationSummary: summary,
    notification_summary: summary,
    auditTrailSummary: {
      currentStatus: item.event_status,
      triggeredAt: createdAt,
      confirmedAt,
      resolvedAt,
      cancelledAt,
    },
  };
}

function emptySummary() {
  return {
    wechat: { pending: 0, sent: 0, failed: 0 },
    sms: { pending: 0, sent: 0, failed: 0 },
    total: { pending: 0, sent: 0, failed: 0 },
  };
}

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
    list: list.map((item) => buildEventPayload(item, summaryMap[item.id] || emptySummary())),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getEventById(userId, eventId) {
  const currentUserId = ensureUserId(userId);
  const currentEventId = ensureEventId(eventId);

  const event = await SosEventModel.findByIdAndUser(currentEventId, currentUserId);
  if (!event) {
    throw createSosError(SOS_ERROR_CODES.EVENT_NOT_FOUND, SOS_ERROR_MESSAGES.EVENT_NOT_FOUND, null, 404);
  }

  const summaryRows = await SosNotificationModel.summarizeByEventIds([event.id]);
  const summaryMap = formatNotificationSummary(summaryRows);
  return buildEventPayload(event, summaryMap[event.id] || emptySummary());
}

async function autoResolveTimeoutEvents(timeoutMinutes) {
  const affectedRows = await SosEventModel.autoResolveTimeoutEvents(timeoutMinutes);
  return { resolved_count: affectedRows };
}

module.exports = {
  getHistory,
  getEventById,
  autoResolveTimeoutEvents,
};
