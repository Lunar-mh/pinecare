'use strict';

const AuditLogModel = require('../../models/auditLog');
const { buildSosNotificationSummaryMap, createEmptySosNotificationSummary } = require('../../utils/sosNotificationSummary');

const ORDER_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const SOS_STATUS_ENUM = ['triggered', 'confirmed', 'resolved', 'cancelled'];

function createBizError(message, code = 400, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function requireCommunityScope(communityId) {
  if (!communityId) {
    throw createBizError('Community scope is required.', 403, 403);
  }
}

function normalizePagination(pagination = {}) {
  const page = Math.max(Number(pagination.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(pagination.pageSize) || 10, 1), 100);
  return { page, pageSize };
}

async function writeAuditLog(actor = {}, action, details = null) {
  await AuditLogModel.create({
    userId: actor.userId || null,
    action,
    details,
  });
}

function toIsoText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildSosAuditTrailSummary(row) {
  const triggeredAt = toIsoText(row.created_at);
  return {
    currentStatus: row.event_status,
    triggeredAt,
    confirmedAt: toIsoText(row.confirmed_at),
    resolvedAt: toIsoText(row.resolved_at),
    cancelledAt: toIsoText(row.cancelled_at),
  };
}

const EMPTY_SUMMARY = createEmptySosNotificationSummary();

function mapSosEvent(row, summaryMap) {
  const createdAt = toIsoText(row.created_at);
  const latestStatusChangedAt =
    toIsoText(row.cancelled_at) ||
    toIsoText(row.resolved_at) ||
    toIsoText(row.confirmed_at) ||
    createdAt;

  return {
    eventId: Number(row.id),
    userId: Number(row.user_id),
    userName: row.nickname || `User${row.user_id}`,
    userPhone: row.phone || '',
    eventStatus: row.event_status,
    triggerType: row.trigger_type,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    address: row.address || '',
    createdAt,
    confirmedAt: toIsoText(row.confirmed_at),
    resolvedAt: toIsoText(row.resolved_at),
    cancelledAt: toIsoText(row.cancelled_at),
    latestStatusChangedAt,
    notificationSummary: summaryMap[Number(row.id)] || EMPTY_SUMMARY,
    auditTrailSummary: buildSosAuditTrailSummary(row),
  };
}

module.exports = {
  ORDER_STATUS_ENUM,
  SOS_STATUS_ENUM,
  buildSosNotificationSummaryMap,
  createBizError,
  mapSosEvent,
  normalizePagination,
  requireCommunityScope,
  writeAuditLog,
};
