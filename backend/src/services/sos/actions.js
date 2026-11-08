'use strict';

const SosEventModel = require('../../models/sosEvent');
const sosNotificationService = require('../sosNotificationService');
const { recordCareEvent } = require('../eventTimelineService');
const { runInTransaction } = require('../../utils/transaction');
const logger = require('../../utils/logger');
const { ensureUserId, ensureEventId, createSosError, SOS_ERROR_CODES, SOS_ERROR_MESSAGES, assertTransition } = require('./shared');

/**
 * @description 加载属于当前用户的 SOS 事件，不存在时抛出 404
 * @param {number} userId 用户ID
 * @param {number} eventId 事件ID
 * @param {import('mysql2/promise').PoolConnection} [connection] 可选事务连接
 * @returns {Promise<object>} SOS 事件对象
 */
async function loadOwnedEventOrThrow(userId, eventId, connection = null) {
  const event = await SosEventModel.findByIdAndUser(eventId, userId, connection);
  if (!event) {
    throw createSosError(SOS_ERROR_CODES.EVENT_NOT_FOUND, SOS_ERROR_MESSAGES.EVENT_NOT_FOUND, null, 404);
  }
  return event;
}

/**
 * @description 触发 SOS 紧急呼救（在事务内原子创建事件并记账流水）
 * 随后异步发起多渠道调度通知（短信/微信通知队列）
 * @param {number} userId 触发用户ID
 * @param {object} payload 呼救上下文（经纬度、地址、触发类型）
 * @returns {Promise<{ event_id: number, event_status: string }>}
 */
async function triggerSos(userId, payload = {}) {
  const currentUserId = ensureUserId(userId);
  const latitude = payload.latitude !== undefined ? Number(payload.latitude) : null;
  const longitude = payload.longitude !== undefined ? Number(payload.longitude) : null;

  const event = await runInTransaction(async (conn) => {
    const createdEvent = await SosEventModel.createEvent({
      userId: currentUserId,
      triggerType: payload.trigger_type || 'manual',
      latitude,
      longitude,
      address: payload.address || null,
    }, conn);

    await recordCareEvent('sos.triggered', {
      userId: currentUserId,
      entityType: 'sos',
      entityId: createdEvent.id,
      status: createdEvent.event_status,
      occurredAt: createdEvent.created_at || new Date().toISOString(),
      details: {
        triggerType: createdEvent.trigger_type || payload.trigger_type || 'manual',
        latitude,
        longitude,
        address: payload.address || null,
      },
    });

    return createdEvent;
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

/**
 * @description 取消 SOS 呼救（5秒内允许误触快速撤回，事务原子化）
 * @param {number} userId 呼救用户ID
 * @param {number} eventId 事件ID
 * @returns {Promise<{ event_id: number, event_status: string }>}
 */
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

  await runInTransaction(async (conn) => {
    const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, 'triggered', 'cancelled', conn);
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
  });

  return { event_id: currentEventId, event_status: 'cancelled' };
}

/**
 * @description 确认 SOS 呼救警情
 * @param {number} userId 呼救用户ID
 * @param {number} eventId 事件ID
 * @returns {Promise<{ event_id: number, event_status: string }>}
 */
async function confirmSos(userId, eventId) {
  const currentUserId = ensureUserId(userId);
  const currentEventId = ensureEventId(eventId);
  const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);
  assertTransition(event.event_status, 'confirmed');

  await runInTransaction(async (conn) => {
    const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, event.event_status, 'confirmed', conn);
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
  });

  return { event_id: currentEventId, event_status: 'confirmed' };
}

/**
 * @description 结案归档 SOS 呼救警情（事务控制与全时序流水记账）
 * @param {number} userId 呼救用户ID
 * @param {number} eventId 事件ID
 * @returns {Promise<{ event_id: number, event_status: string }>}
 */
async function resolveSos(userId, eventId) {
  const currentUserId = ensureUserId(userId);
  const currentEventId = ensureEventId(eventId);
  const event = await loadOwnedEventOrThrow(currentUserId, currentEventId);
  assertTransition(event.event_status, 'resolved');

  await runInTransaction(async (conn) => {
    const updated = await SosEventModel.transitionStatus(currentEventId, currentUserId, event.event_status, 'resolved', conn);
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
  });

  return { event_id: currentEventId, event_status: 'resolved' };
}

module.exports = {
  triggerSos,
  cancelSos,
  confirmSos,
  resolveSos,
};
