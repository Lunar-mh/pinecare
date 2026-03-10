'use strict';

const SosEventModel = require('../models/sosEvent');
const SosNotificationModel = require('../models/sosNotification');
const sosNotificationService = require('./sosNotificationService');
const { assertTransition } = require('../utils/sosStateMachine');
const { SOS_ERROR_CODES, SOS_ERROR_MESSAGES, createSosError } = require('../utils/errorCodes');

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
    throw createSosError(SOS_ERROR_CODES.PARAM_ERROR, 'event_id 必须为正整数', null, 400);
  }
  return numericEventId;
}

async function loadOwnedEventOrThrow(userId, eventId) {
  const event = await SosEventModel.findByIdAndUser(eventId, userId);
  if (!event) {
    throw createSosError(SOS_ERROR_CODES.EVENT_NOT_FOUND, SOS_ERROR_MESSAGES.EVENT_NOT_FOUND, null, 404);
  }
  return event;
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

const sosService = {
  async triggerSos(userId, payload = {}) {
    const currentUserId = ensureUserId(userId);

    const latitude = payload.latitude !== undefined ? Number(payload.latitude) : null;
    const longitude = payload.longitude !== undefined ? Number(payload.longitude) : null;

    const event = await SosEventModel.createEvent({
      userId: currentUserId,
      triggerType: payload.trigger_type || 'manual',
      latitude,
      longitude,
      address: payload.address || null,
    });

    setImmediate(async () => {
      try {
        await sosNotificationService.createAndDispatch(event);
      } catch (err) {
        console.error('SOS 通知编排失败:', err.message);
      }
    });

    return {
      event_id: event.id,
      event_status: event.event_status,
    };
  },

  async cancelSos(userId, eventId) {
    const currentUserId = ensureUserId(userId);
    const currentEventId = ensureEventId(eventId);
    const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);

    if (event.event_status !== 'triggered') {
      throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, {
        current_status: event.event_status,
      }, 409);
    }

    try {
      const now = Date.now();
      const createdAt = new Date(event.created_at).getTime();
      if (now - createdAt > 5000) throw new Error('取消窗口已超时');
    } catch (err) {
      if (err.message === '取消窗口已超时') {
        throw createSosError(SOS_ERROR_CODES.CANCEL_TIMEOUT, SOS_ERROR_MESSAGES.CANCEL_TIMEOUT, null, 408);
      }
      throw err;
    }

    const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, 'triggered', 'cancelled');
    if (!updated) {
      throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, null, 409);
    }

    return {
      event_id: currentEventId,
      event_status: 'cancelled',
    };
  },

  async confirmSos(userId, eventId) {
    const currentUserId = ensureUserId(userId);
    const currentEventId = ensureEventId(eventId);
    const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);

    assertTransition(event.event_status, 'confirmed');

    const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, event.event_status, 'confirmed');
    if (!updated) {
      throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, null, 409);
    }

    return {
      event_id: currentEventId,
      event_status: 'confirmed',
    };
  },

  async resolveSos(userId, eventId) {
    const currentUserId = ensureUserId(userId);
    const currentEventId = ensureEventId(eventId);
    const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);

    assertTransition(event.event_status, 'resolved');

    const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, event.event_status, 'resolved');
    if (!updated) {
      throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, null, 409);
    }

    return {
      event_id: currentEventId,
      event_status: 'resolved',
    };
  },

  async getHistory(userId, params = {}) {
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
        event_id: item.id,
        event_status: item.event_status,
        trigger_type: item.trigger_type,
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address,
        created_at: item.created_at,
        confirmed_at: item.confirmed_at,
        resolved_at: item.resolved_at,
        cancelled_at: item.cancelled_at,
        notification_summary:
          summaryMap[item.id] || {
            wechat: { pending: 0, sent: 0, failed: 0 },
            sms: { pending: 0, sent: 0, failed: 0 },
            total: { pending: 0, sent: 0, failed: 0 },
          },
      })),
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  },

  async autoResolveTimeoutEvents(timeoutMinutes) {
    const affectedRows = await SosEventModel.autoResolveTimeoutEvents(timeoutMinutes);
    return {
      resolved_count: affectedRows,
    };
  },
};

module.exports = sosService;
