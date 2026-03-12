'use strict';

const SosEventModel = require('../models/sosEvent');
const SosNotificationModel = require('../models/sosNotification');
const sosNotificationService = require('./sosNotificationService');
const { recordCareEvent } = require('./eventTimelineService');
const { assertTransition } = require('../utils/sosStateMachine');
const { SOS_ERROR_CODES, SOS_ERROR_MESSAGES, createSosError } = require('../utils/errorCodes');
const logger = require('../utils/logger');

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

async function loadOwnedEventOrThrow(userId, eventId) {
  const event = await SosEventModel.findByIdAndUser(eventId, userId);
  if (!event) {
    throw createSosError(
      SOS_ERROR_CODES.EVENT_NOT_FOUND,
      SOS_ERROR_MESSAGES.EVENT_NOT_FOUND,
      null,
      404
    );
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

function toIsoText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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

    await recordCareEvent('sos.triggered', {
      userId: currentUserId,
      entityType: 'sos',
      entityId: event.id,
      status: event.event_status,
      occurredAt: event.created_at || new Date().toISOString(),
      details: {
        triggerType: event.trigger_type || payload.trigger_type || 'manual',
        latitude,
        longitude,
        address: payload.address || null,
      },
    });

    setImmediate(async () => {
      try {
        await sosNotificationService.createAndDispatch(event);
      } catch (err) {
        logger.error('sosService', 'notification_dispatch_failed', {
          eventId: event.id,
          userId: currentUserId,
          message: err.message,
        });
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
      throw createSosError(
        SOS_ERROR_CODES.INVALID_STATUS,
        SOS_ERROR_MESSAGES.INVALID_STATUS,
        {
          current_status: event.event_status,
        },
        409
      );
    }

    const now = Date.now();
    const createdAt = new Date(event.created_at).getTime();
    if (now - createdAt > 5000) {
      throw createSosError(
        SOS_ERROR_CODES.CANCEL_TIMEOUT,
        SOS_ERROR_MESSAGES.CANCEL_TIMEOUT,
        null,
        408
      );
    }

    const updated = await SosEventModel.transitionStatus(
      currentEventId,
      currentUserId,
      'triggered',
      'cancelled'
    );
    if (!updated) {
      throw createSosError(
        SOS_ERROR_CODES.INVALID_STATUS,
        SOS_ERROR_MESSAGES.INVALID_STATUS,
        null,
        409
      );
    }

    await recordCareEvent('sos.cancelled', {
      userId: currentUserId,
      entityType: 'sos',
      entityId: currentEventId,
      status: 'cancelled',
      details: {
        statusFrom: 'triggered',
        statusTo: 'cancelled',
      },
    });

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

    const updated = await SosEventModel.transitionStatus(
      currentEventId,
      currentUserId,
      event.event_status,
      'confirmed'
    );
    if (!updated) {
      throw createSosError(
        SOS_ERROR_CODES.INVALID_STATUS,
        SOS_ERROR_MESSAGES.INVALID_STATUS,
        null,
        409
      );
    }

    await recordCareEvent('sos.confirmed', {
      userId: currentUserId,
      entityType: 'sos',
      entityId: currentEventId,
      status: 'confirmed',
      details: {
        statusFrom: event.event_status,
        statusTo: 'confirmed',
      },
    });

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

    const updated = await SosEventModel.transitionStatus(
      currentEventId,
      currentUserId,
      event.event_status,
      'resolved'
    );
    if (!updated) {
      throw createSosError(
        SOS_ERROR_CODES.INVALID_STATUS,
        SOS_ERROR_MESSAGES.INVALID_STATUS,
        null,
        409
      );
    }

    await recordCareEvent('sos.resolved', {
      userId: currentUserId,
      entityType: 'sos',
      entityId: currentEventId,
      status: 'resolved',
      details: {
        statusFrom: event.event_status,
        statusTo: 'resolved',
      },
    });

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
  },

  async autoResolveTimeoutEvents(timeoutMinutes) {
    const affectedRows = await SosEventModel.autoResolveTimeoutEvents(timeoutMinutes);
    return {
      resolved_count: affectedRows,
    };
  },
};

module.exports = sosService;
