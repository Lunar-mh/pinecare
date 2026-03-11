'use strict';

const familyModel = require('../models/family');
const familySpaceModel = require('../models/familySpace');
const SosEventModel = require('../models/sosEvent');
const medicationLogService = require('./medicationLogService');
const {
  DEFAULT_NOTIFICATION_SETTINGS,
  createBizError,
  isRecentWithinHours,
  normalizeBoolean,
  normalizeElderId,
  pickLatestTime,
  selectBinding,
  toIsoText,
} = require('./family/shared');
const {
  buildBloodPressureSummary,
  buildHeartRateSummary,
  buildInteractionEvidenceSummary,
  buildLocationSummary,
  buildMedicationAlert,
  buildMedicationSummary,
  buildSosAlerts,
} = require('./family/overviewBuilders');

function buildLatestMetrics(records = []) {
  const latestMetrics = {};
  records.forEach((item) => {
    if (!latestMetrics[item.metricType]) {
      latestMetrics[item.metricType] = item;
    }
  });
  return latestMetrics;
}

function normalizeNotificationPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createBizError(422, 'Request body must be an object.', 422);
  }

  const fieldMap = [
    ['healthAlertEnabled', 'healthAlertEnabled'],
    ['medicationReminderEnabled', 'medicationReminderEnabled'],
    ['sosAlertEnabled', 'sosAlertEnabled'],
    ['health_alert_enabled', 'healthAlertEnabled'],
    ['medication_reminder_enabled', 'medicationReminderEnabled'],
    ['sos_alert_enabled', 'sosAlertEnabled'],
  ];

  const updates = {};
  fieldMap.forEach(([inputKey, outputKey]) => {
    if (Object.prototype.hasOwnProperty.call(payload, inputKey)) {
      updates[outputKey] = normalizeBoolean(payload[inputKey], inputKey);
    }
  });

  if (Object.keys(updates).length === 0) {
    throw createBizError(422, 'At least one notification field is required.', 422);
  }

  return updates;
}

const familyService = {
  async getFamilyBindings(userId) {
    return familyModel.listBindingsByFamilyId(Number(userId));
  },

  async getElderlyOverview(userId, options = {}) {
    const bindings = await familyModel.listBindingsByFamilyId(Number(userId));
    if (!bindings || bindings.length === 0) {
      return null;
    }

    const elderId = normalizeElderId(options.elderId);
    const binding = selectBinding(bindings, elderId);
    const selectedElderId = Number(binding.elderId);
    const familyId = selectedElderId;

    const [snapshot, todayMeds, activeSosEvents, location, interactionEvidence] = await Promise.all([
      familyModel.getLatestHealthSnapshot(selectedElderId),
      medicationLogService.getTodaySchedule(selectedElderId).catch(() => []),
      SosEventModel.listActiveByUser(selectedElderId, 3).catch(() => []),
      familyModel.getLatestLocation(selectedElderId).catch(() => null),
      familySpaceModel.getInteractionEvidenceSummary(familyId).catch(() => null),
    ]);

    const latestRecords = snapshot ? snapshot.latestRecords : [];
    const medicationSummary = buildMedicationSummary(todayMeds);
    const alerts = buildSosAlerts(activeSosEvents);
    const medicationAlert = buildMedicationAlert(medicationSummary);
    if (medicationAlert) {
      alerts.push(medicationAlert);
    }

    const lastActiveAt = pickLatestTime([
      snapshot && snapshot.archive ? snapshot.archive.updatedAt : null,
      location ? location.updatedAt : null,
      interactionEvidence ? interactionEvidence.lastInteractionAt : null,
      activeSosEvents[0] ? activeSosEvents[0].created_at : null,
    ]);

    const elderProfile = binding.elderProfile || {};

    return {
      elderProfile: {
        elderId: selectedElderId,
        familyId,
        name: elderProfile.realName || elderProfile.nickname || `User${selectedElderId}`,
        nickname: elderProfile.nickname || null,
        realName: elderProfile.realName || null,
        avatarUrl: elderProfile.avatarUrl || null,
        isOnline: isRecentWithinHours(lastActiveAt, 24),
        lastActiveAt,
      },
      todayHealthSummary: {
        bloodPressure: buildBloodPressureSummary(latestRecords),
        heartRate: buildHeartRateSummary(latestRecords),
        updatedAt: snapshot && snapshot.archive ? toIsoText(snapshot.archive.updatedAt) : null,
      },
      medicationSummary,
      locationSummary: buildLocationSummary(location),
      alerts,
      interactionEvidenceSummary: buildInteractionEvidenceSummary(familyId, interactionEvidence),
    };
  },

  async getElderHealth(userId, elderId) {
    const parsedElderId = normalizeElderId(elderId);
    const allowed = await familyModel.checkFamilyBinding(Number(userId), parsedElderId);

    if (!allowed) {
      throw createBizError(403, 'No permission to access this elder health data.', 403);
    }

    const snapshot = await familyModel.getLatestHealthSnapshot(parsedElderId);
    if (!snapshot) {
      throw createBizError(404, 'Health archive not found.', 404);
    }

    return {
      elderId: parsedElderId,
      archive: snapshot.archive,
      latestRecords: snapshot.latestRecords,
      latestMetrics: buildLatestMetrics(snapshot.latestRecords),
    };
  },

  async getNotificationSettings(userId) {
    const settings = await familyModel.findNotificationSettingsByUserId(Number(userId));
    if (!settings) {
      return {
        userId: Number(userId),
        ...DEFAULT_NOTIFICATION_SETTINGS,
      };
    }

    return settings;
  },

  async updateNotificationSettings(userId, payload = {}) {
    const updates = normalizeNotificationPayload(payload);
    const current = await this.getNotificationSettings(Number(userId));
    const merged = {
      healthAlertEnabled: updates.healthAlertEnabled ?? current.healthAlertEnabled,
      medicationReminderEnabled:
        updates.medicationReminderEnabled ?? current.medicationReminderEnabled,
      sosAlertEnabled: updates.sosAlertEnabled ?? current.sosAlertEnabled,
    };

    const saved = await familyModel.upsertNotificationSettings(Number(userId), merged);
    return saved || { userId: Number(userId), ...merged };
  },
};

module.exports = familyService;
