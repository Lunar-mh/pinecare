'use strict';

const redis = require('../config/redis');
const logger = require('../utils/logger');
const FallModel = require('../models/fall');
const notificationService = require('./notificationService');
const { recordCareEvent } = require('./eventTimelineService');
const { dispatchNotifications } = require('./fall/notificationDispatcher');
const { THRESHOLDS, createBizError, ensureSensitivity, normalizeSensorData, settingsKey, timerKey } = require('./fall/shared');

const TIMER_SECONDS = parseInt(process.env.FALL_COUNTDOWN_SECONDS || '15', 10);
const SETTINGS_CACHE_TTL = parseInt(process.env.FALL_SETTINGS_CACHE_TTL || '86400', 10);
const HISTORY_STATUS = ['detecting', 'confirmed', 'cancelled', 'false_alarm'];

let workerTimer = null;
let workerRunning = false;

function readOccurredAt(event, fields) {
  return fields.map((field) => event && event[field]).find(Boolean) || null;
}

async function cacheSettings(userId, settings, action) {
  try {
    await redis.set(settingsKey(userId), JSON.stringify(settings), 'EX', SETTINGS_CACHE_TTL);
  } catch (error) {
    logger.warn('fallService', action, { userId, error: error.message });
  }
}

const fallService = {
  detectFall(sensorData, sensitivity) {
    const finalSensitivity = ensureSensitivity(sensitivity || 'medium');
    const threshold = THRESHOLDS[finalSensitivity];
    const normalized = normalizeSensorData(sensorData);
    const isFall = normalized.verticalPeak > threshold.vertical && normalized.horizontalChangeRate > threshold.horizontal;
    return {
      isFall,
      verticalPeak: normalized.verticalPeak,
      horizontalChangeRate: normalized.horizontalChangeRate,
      threshold,
      sensitivity: finalSensitivity,
    };
  },

  async reportFall(userId, sensorData) {
    if (!userId) throw createBizError(401, 'User is not authenticated.', 401);
    const { sensitivity = 'medium' } = await this.getFallSettings(userId);
    const detection = this.detectFall(sensorData, sensitivity);

    if (!detection.isFall) {
      const eventId = await FallModel.createFalseAlarmEvent(userId, sensorData, sensitivity);
      const event = await FallModel.findEventById(eventId);
      await recordCareEvent('fall.false_alarm', {
        userId,
        entityType: 'fall',
        entityId: eventId,
        status: 'false_alarm',
        occurredAt: readOccurredAt(event, ['detectedAt', 'createdAt']),
        details: { sensitivity, detection },
      });
      return { detected: false, reason: 'no-fall', event, detection };
    }

    const eventId = await FallModel.createDetectingEvent(userId, sensorData, sensitivity);
    await redis.set(timerKey(eventId), String(eventId), 'EX', TIMER_SECONDS);
    const event = await FallModel.findEventById(eventId);
    await recordCareEvent('fall.detected', {
      userId,
      entityType: 'fall',
      entityId: eventId,
      status: 'detecting',
      occurredAt: readOccurredAt(event, ['detectedAt', 'createdAt']),
      details: { sensitivity, detection, countdownSeconds: TIMER_SECONDS },
    });
    return { detected: true, event, detection, countdownSeconds: TIMER_SECONDS };
  },

  async cancelFall(userId, eventId) {
    const numericEventId = Number(eventId);
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
      throw createBizError(400, 'eventId is invalid.', 400);
    }

    const event = await FallModel.findEventByIdAndUser(numericEventId, userId);
    if (!event) throw createBizError(404, 'Fall event does not exist.', 404);
    if (event.status !== 'detecting') throw createBizError(409, 'Current status does not allow cancellation.', 409);
    if (!(await FallModel.markCancelled(numericEventId))) {
      throw createBizError(409, 'Event was already processed and cannot be cancelled.', 409);
    }

    await redis.del(timerKey(numericEventId));
    const latest = await FallModel.findEventByIdAndUser(numericEventId, userId);
    await recordCareEvent('fall.cancelled', {
      userId,
      entityType: 'fall',
      entityId: numericEventId,
      status: 'cancelled',
      occurredAt: readOccurredAt(latest, ['cancelledAt', 'createdAt']),
      details: { statusFrom: 'detecting', statusTo: 'cancelled' },
    });
    return { event: latest, cancelled: true };
  },

  async processPendingFall(eventId) {
    const numericEventId = Number(eventId);
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) return { processed: false, reason: 'invalid-event-id' };

    const event = await FallModel.findEventById(numericEventId);
    if (!event) return { processed: false, reason: 'not-found' };
    if (event.status !== 'detecting') return { processed: false, reason: 'already-processed', event };
    if (!(await FallModel.markConfirmed(numericEventId))) return { processed: false, reason: 'race-lost', event };

    await redis.del(timerKey(numericEventId));
    const latestEvent = await FallModel.findEventById(numericEventId);
    const contacts = await FallModel.getNotificationContacts(latestEvent.userId);
    await FallModel.createNotificationRecords(numericEventId, contacts);
    const notifications = await FallModel.findNotificationsByEventId(numericEventId);
    const notification = await dispatchNotifications({
      FallModel,
      notificationService,
      latestEvent,
      contacts,
      notifications,
    });

    await recordCareEvent('fall.confirmed', {
      userId: latestEvent.userId,
      entityType: 'fall',
      entityId: numericEventId,
      status: latestEvent.status,
      occurredAt: readOccurredAt(latestEvent, ['confirmedAt', 'detectedAt', 'createdAt']),
      details: { delivery: notification, contactsNotified: contacts.length },
    });
    return { processed: true, event: latestEvent, notification };
  },

  async getFallHistory(userId, params = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 10));
    const rawStatus = params.status;
    const status = rawStatus === undefined || rawStatus === null || rawStatus === '' ? null : String(rawStatus);
    if (status && !HISTORY_STATUS.includes(status)) {
      throw createBizError(400, 'status parameter is invalid.', 400);
    }

    const [total, list] = await Promise.all([
      FallModel.countHistory(userId, { status }),
      FallModel.listHistory(userId, { page, pageSize, status }),
    ]);
    return { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  },

  async getFallSettings(userId) {
    const cacheKey = settingsKey(userId);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      logger.warn('fallService', 'settings_cache_read_failed', { userId, error: error.message });
    }

    const row = await FallModel.getSensitivitySetting(userId);
    const settings = { sensitivity: row ? row.sensitivity : 'medium', updatedAt: row ? row.updatedAt : null };
    await cacheSettings(userId, settings, 'settings_cache_write_failed');
    return settings;
  },

  async updateFallSettings(userId, sensitivity) {
    await FallModel.upsertSensitivitySetting(userId, ensureSensitivity(sensitivity));
    const settings = await FallModel.getSensitivitySetting(userId);
    const result = { sensitivity: settings.sensitivity, updatedAt: settings.updatedAt };
    await cacheSettings(userId, result, 'settings_cache_sync_failed');
    return result;
  },

  startCountdownWorker() {
    if (workerTimer) return;
    workerTimer = setInterval(async () => {
      if (workerRunning) return;
      workerRunning = true;
      try {
        const events = await FallModel.findExpiredDetectingEvents(TIMER_SECONDS);
        for (const event of events) {
          try {
            await this.processPendingFall(event.id);
          } catch (error) {
            logger.error('fallService', 'pending_fall_process_failed', { eventId: event.id, error: error.message });
          }
        }
      } catch (error) {
        logger.error('fallService', 'countdown_worker_failed', { error: error.message });
      } finally {
        workerRunning = false;
      }
    }, 1000);
    if (typeof workerTimer.unref === 'function') workerTimer.unref();
  },

  stopCountdownWorker() {
    if (!workerTimer) return;
    clearInterval(workerTimer);
    workerTimer = null;
  },
};

module.exports = fallService;
