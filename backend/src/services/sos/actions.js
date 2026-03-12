'use strict';

const SosEventModel = require('../../models/sosEvent');
const sosNotificationService = require('../sosNotificationService');
const { recordCareEvent } = require('../eventTimelineService');
const logger = require('../../utils/logger');
const { ensureUserId, ensureEventId, createSosError, SOS_ERROR_CODES, SOS_ERROR_MESSAGES, assertTransition } = require('./shared');

async function loadOwnedEventOrThrow(userId, eventId) {
  const event = await SosEventModel.findByIdAndUser(eventId, userId);
  if (!event) {
    throw createSosError(SOS_ERROR_CODES.EVENT_NOT_FOUND, SOS_ERROR_MESSAGES.EVENT_NOT_FOUND, null, 404);
  }
  return event;
}

async function triggerSos(userId, payload = {}) {
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

  return { event_id: event.id, event_status: event.event_status };
}

async function cancelSos(userId, eventId) {
  const currentUserId = ensureUserId(userId);
  const currentEventId = ensureEventId(eventId);
  const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);

  if (event.event_status !== 'triggered') {
    throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, { current_status: event.event_status }, 409);
  }

  const now = Date.now();
  const createdAt = new Date(event.created_at).getTime();
  if (now - createdAt > 5000) {
    throw createSosError(SOS_ERROR_CODES.CANCEL_TIMEOUT, SOS_ERROR_MESSAGES.CANCEL_TIMEOUT, null, 408);
  }

  const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, 'triggered', 'cancelled');
  if (!updated) {
    throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, null, 409);
  }

  await recordCareEvent('sos.cancelled', {
    userId: currentUserId,
    entityType: 'sos',
    entityId: currentEventId,
    status: 'cancelled',
    details: { statusFrom: 'triggered', statusTo: 'cancelled' },
  });

  return { event_id: currentEventId, event_status: 'cancelled' };
}

async function confirmSos(userId, eventId) {
  const currentUserId = ensureUserId(userId);
  const currentEventId = ensureEventId(eventId);
  const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);
  assertTransition(event.event_status, 'confirmed');

  const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, event.event_status, 'confirmed');
  if (!updated) {
    throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, null, 409);
  }

  await recordCareEvent('sos.confirmed', {
    userId: currentUserId,
    entityType: 'sos',
    entityId: currentEventId,
    status: 'confirmed',
    details: { statusFrom: event.event_status, statusTo: 'confirmed' },
  });

  return { event_id: currentEventId, event_status: 'confirmed' };
}

async function resolveSos(userId, eventId) {
  const currentUserId = ensureUserId(userId);
  const currentEventId = ensureEventId(eventId);
  const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);
  assertTransition(event.event_status, 'resolved');

  const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, event.event_status, 'resolved');
  if (!updated) {
    throw createSosError(SOS_ERROR_CODES.INVALID_STATUS, SOS_ERROR_MESSAGES.INVALID_STATUS, null, 409);
  }

  await recordCareEvent('sos.resolved', {
    userId: currentUserId,
    entityType: 'sos',
    entityId: currentEventId,
    status: 'resolved',
    details: { statusFrom: event.event_status, statusTo: 'resolved' },
  });

  return { event_id: currentEventId, event_status: 'resolved' };
}

module.exports = {
  triggerSos,
  cancelSos,
  confirmSos,
  resolveSos,
};
