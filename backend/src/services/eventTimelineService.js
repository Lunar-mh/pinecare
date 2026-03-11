'use strict';

const AuditLogModel = require('../models/auditLog');

const CARE_EVENT_ACTIONS = new Set([
  'location.upload',
  'sos.triggered',
  'sos.cancelled',
  'sos.confirmed',
  'sos.resolved',
  'fall.detected',
  'fall.false_alarm',
  'fall.cancelled',
  'fall.confirmed',
  'community.sos.confirm',
  'community.sos.resolve',
  'community.sos.cancel',
]);

const AUDIT_FAILURE_HISTORY_LIMIT = Math.max(
  5,
  Number(process.env.CARE_EVENT_AUDIT_FAILURE_HISTORY_LIMIT || 20)
);
const AUDIT_FAILURE_LOG_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.CARE_EVENT_AUDIT_LOG_COOLDOWN_MS || 5000)
);

const auditFailureState = {
  totalFailures: 0,
  suppressedLogs: 0,
  recentFailures: [],
  lastLoggedAtByKey: new Map(),
};

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(value, startDate, endDate) {
  const date = toDate(value);
  if (!date) {
    return false;
  }
  return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
}

function sortTimeline(list) {
  return list.sort((left, right) => {
    const leftTime = toDate(left.occurredAt);
    const rightTime = toDate(right.occurredAt);
    return rightTime.getTime() - leftTime.getTime();
  });
}

function buildFailureEntry(action, payload, err) {
  return {
    occurredAt: new Date().toISOString(),
    action,
    userId: payload && payload.userId ? Number(payload.userId) : null,
    entityType: payload && payload.entityType ? payload.entityType : null,
    entityId: payload && payload.entityId ? payload.entityId : null,
    status: payload && payload.status ? payload.status : null,
    message: err && err.message ? String(err.message) : 'Unknown audit log write failure.',
  };
}

function rememberFailure(entry) {
  auditFailureState.totalFailures += 1;
  auditFailureState.recentFailures.unshift(entry);
  if (auditFailureState.recentFailures.length > AUDIT_FAILURE_HISTORY_LIMIT) {
    auditFailureState.recentFailures = auditFailureState.recentFailures.slice(
      0,
      AUDIT_FAILURE_HISTORY_LIMIT
    );
  }

  const key = `${entry.action}:${entry.message}`;
  const now = Date.now();
  const lastLoggedAt = auditFailureState.lastLoggedAtByKey.get(key) || 0;
  if (now - lastLoggedAt < AUDIT_FAILURE_LOG_COOLDOWN_MS) {
    auditFailureState.suppressedLogs += 1;
    return false;
  }

  auditFailureState.lastLoggedAtByKey.set(key, now);
  return true;
}

function getCareEventAuditDiagnostics(limit = 10) {
  const safeLimit = Math.min(
    AUDIT_FAILURE_HISTORY_LIMIT,
    Math.max(1, Number(limit) || Math.min(10, AUDIT_FAILURE_HISTORY_LIMIT))
  );
  const items = auditFailureState.recentFailures.slice(0, safeLimit);

  return {
    totalFailures: auditFailureState.totalFailures,
    suppressedLogs: auditFailureState.suppressedLogs,
    recentCount: items.length,
    items,
  };
}

function resetCareEventAuditDiagnostics() {
  auditFailureState.totalFailures = 0;
  auditFailureState.suppressedLogs = 0;
  auditFailureState.recentFailures = [];
  auditFailureState.lastLoggedAtByKey.clear();
}

async function recordCareEvent(action, payload = {}) {
  try {
    await AuditLogModel.create({
      userId: payload.userId ? Number(payload.userId) : null,
      action,
      details: {
        entityType: payload.entityType || null,
        entityId: payload.entityId || null,
        status: payload.status || null,
        occurredAt: payload.occurredAt || new Date().toISOString(),
        ...payload.details,
      },
    });
  } catch (err) {
    const entry = buildFailureEntry(action, payload, err);
    const shouldLog = rememberFailure(entry);
    if (shouldLog && process.env.NODE_ENV !== 'test') {
      console.warn('care_event_audit_failed', entry);
    }
  }
}

function buildSosDeliverySummary(summaryRows = []) {
  const summaryMap = new Map();

  summaryRows.forEach((row) => {
    const eventId = Number(row.sos_event_id);
    const current = summaryMap.get(eventId) || {
      wechat: { pending: 0, sent: 0, failed: 0 },
      sms: { pending: 0, sent: 0, failed: 0 },
      total: { pending: 0, sent: 0, failed: 0 },
    };

    const pending = Number(row.pending_count) || 0;
    const sent = Number(row.sent_count) || 0;
    const failed = Number(row.failed_count) || 0;
    const channel = row.notify_type === 'wechat' ? 'wechat' : 'sms';

    current[channel] = { pending, sent, failed };
    current.total.pending += pending;
    current.total.sent += sent;
    current.total.failed += failed;
    summaryMap.set(eventId, current);
  });

  return summaryMap;
}

function buildFallDeliverySummary(notifications = []) {
  return notifications.reduce(
    (acc, item) => {
      const status = item && item.status ? String(item.status) : 'pending';
      if (status === 'sent') acc.sent += 1;
      else if (status === 'failed') acc.failed += 1;
      else acc.pending += 1;
      acc.total += 1;
      return acc;
    },
    { pending: 0, sent: 0, failed: 0, total: 0 }
  );
}

function buildAuditTimelineItem(item) {
  if (!item || !CARE_EVENT_ACTIONS.has(String(item.action))) {
    return null;
  }

  return {
    type: 'audit',
    entityType: item.details && item.details.entityType ? item.details.entityType : 'audit',
    occurredAt: item.createdAt,
    title: item.action,
    payload: item,
  };
}

function buildUnifiedTimeline({
  startDate,
  endDate,
  locations = [],
  sosEvents = [],
  sosSummaryRows = [],
  fallEvents = [],
  fallNotificationsByEvent = {},
  auditLogs = [],
}) {
  const sosDeliveryMap = buildSosDeliverySummary(sosSummaryRows);

  const timeline = [
    ...locations
      .filter((item) => isWithinRange(item.createdAt, startDate, endDate))
      .map((item) => ({
        type: 'gps',
        entityType: 'location',
        occurredAt: item.createdAt,
        title: 'Location upload',
        payload: item,
      })),
    ...sosEvents
      .filter((item) => isWithinRange(item.updated_at || item.created_at, startDate, endDate))
      .map((item) => ({
        type: 'sos',
        entityType: 'sos',
        occurredAt: item.updated_at || item.created_at,
        title: `SOS ${item.event_status}`,
        delivery: sosDeliveryMap.get(Number(item.id)) || {
          wechat: { pending: 0, sent: 0, failed: 0 },
          sms: { pending: 0, sent: 0, failed: 0 },
          total: { pending: 0, sent: 0, failed: 0 },
        },
        payload: item,
      })),
    ...fallEvents
      .filter((item) => isWithinRange(item.detectedAt || item.createdAt, startDate, endDate))
      .map((item) => ({
        type: 'fall',
        entityType: 'fall',
        occurredAt: item.detectedAt || item.createdAt,
        title: `Fall ${item.status}`,
        delivery: buildFallDeliverySummary(fallNotificationsByEvent[item.id] || []),
        payload: item,
      })),
    ...auditLogs
      .filter((item) => isWithinRange(item.createdAt, startDate, endDate))
      .map((item) => buildAuditTimelineItem(item))
      .filter(Boolean),
  ];

  return sortTimeline(timeline);
}

module.exports = {
  CARE_EVENT_ACTIONS,
  buildFallDeliverySummary,
  buildSosDeliverySummary,
  buildUnifiedTimeline,
  getCareEventAuditDiagnostics,
  isWithinRange,
  recordCareEvent,
  resetCareEventAuditDiagnostics,
  sortTimeline,
  toDate,
};




