'use strict';

const { assertTransition } = require('../../utils/sosStateMachine');
const { SOS_ERROR_CODES, SOS_ERROR_MESSAGES, createSosError } = require('../../utils/errorCodes');

function ensureUserId(userId) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    throw createSosError(SOS_ERROR_CODES.UNAUTHORIZED, SOS_ERROR_MESSAGES.UNAUTHORIZED, null, 401);
  }
  return numericUserId;
}

function ensureEventId(eventId) {
  const numericEventId = Number(eventId);
  if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
    throw createSosError(SOS_ERROR_CODES.PARAM_ERROR, 'event_id is invalid.', null, 400);
  }
  return numericEventId;
}

function formatNotificationSummary(summaryRows) {
  const summaryMap = {};

  summaryRows.forEach((row) => {
    const eventId = Number(row.sos_event_id);
    if (!summaryMap[eventId]) {
      summaryMap[eventId] = {
        wechat: { pending: 0, sent: 0, failed: 0 },
        sms: { pending: 0, sent: 0, failed: 0 },
        total: { pending: 0, sent: 0, failed: 0 },
      };
    }

    const pending = Number(row.pending_count) || 0;
    const sent = Number(row.sent_count) || 0;
    const failed = Number(row.failed_count) || 0;
    const channel = row.notify_type === 'wechat' ? 'wechat' : 'sms';

    summaryMap[eventId][channel] = { pending, sent, failed };
    summaryMap[eventId].total.pending += pending;
    summaryMap[eventId].total.sent += sent;
    summaryMap[eventId].total.failed += failed;
  });

  return summaryMap;
}

function toIsoText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

module.exports = {
  assertTransition,
  createSosError,
  SOS_ERROR_CODES,
  SOS_ERROR_MESSAGES,
  ensureUserId,
  ensureEventId,
  formatNotificationSummary,
  toIsoText,
};
