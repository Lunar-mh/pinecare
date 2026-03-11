'use strict';

const familyModel = require('../models/family');
const familySpaceModel = require('../models/familySpace');
const SosEventModel = require('../models/sosEvent');
const medicationLogService = require('./medicationLogService');

const DEFAULT_NOTIFICATION_SETTINGS = {
  healthAlertEnabled: true,
  medicationReminderEnabled: true,
  sosAlertEnabled: true,
};

function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

function normalizeElderId(elderId) {
  if (elderId === undefined || elderId === null || elderId === '') {
    return null;
  }

  const parsed = Number(elderId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(422, 'elderId must be a positive integer.', 422);
  }
  return parsed;
}

function normalizeBoolean(value, fieldName) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (text === '1' || text === 'true') return true;
    if (text === '0' || text === 'false') return false;
  }

  throw createBizError(422, `${fieldName} must be a boolean-like value.`, 422);
}

function toIsoText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isRecentWithinHours(value, hours) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= hours * 60 * 60 * 1000;
}

function pickLatestTime(values) {
  const latest = values
    .map((item) => (item ? new Date(item).getTime() : NaN))
    .filter((item) => !Number.isNaN(item))
    .sort((a, b) => b - a)[0];

  return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
}

function selectBinding(bindings, elderId) {
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return null;
  }

  if (!elderId) {
    return bindings[0];
  }

  const target = bindings.find((item) => Number(item.elderId) === elderId);
  if (!target) {
    throw createBizError(404, 'Bound elder not found.', 404);
  }

  return target;
}

function buildBloodPressureSummary(latestRecords) {
  const row = (latestRecords || []).find((item) => item.metricType === 'blood_pressure');
  if (!row) {
    return null;
  }

  const systolic = row.valueHigh == null ? null : Number(row.valueHigh);
  const diastolic = row.valueLow == null ? null : Number(row.valueLow);

  return {
    recordId: Number(row.id),
    systolic,
    diastolic,
    measuredAt: toIsoText(row.measuredAt),
    status:
      systolic !== null && diastolic !== null && (systolic > 140 || diastolic > 90)
        ? 'warning'
        : 'normal',
  };
}

function buildHeartRateSummary(latestRecords) {
  const row = (latestRecords || []).find((item) => item.metricType === 'heart_rate');
  if (!row) {
    return null;
  }

  const value = row.value == null ? null : Number(row.value);
  return {
    recordId: Number(row.id),
    value,
    measuredAt: toIsoText(row.measuredAt),
    status: value !== null && (value < 60 || value > 100) ? 'warning' : 'normal',
  };
}

function buildMedicationSummary(todayMeds) {
  const list = Array.isArray(todayMeds) ? todayMeds : [];
  const counts = {
    totalTasks: list.length,
    completedTasks: 0,
    pendingTasks: 0,
    skippedTasks: 0,
    missedTasks: 0,
  };

  let latestUpdateAt = null;

  list.forEach((item) => {
    const status = String(item.status || '').trim();
    if (status === 'taken') counts.completedTasks += 1;
    if (status === 'pending') counts.pendingTasks += 1;
    if (status === 'skipped') counts.skippedTasks += 1;
    if (status === 'missed') counts.missedTasks += 1;

    latestUpdateAt = pickLatestTime([
      latestUpdateAt,
      item.actualTime,
      item.scheduledTime,
      item.updatedAt,
      item.takenAt,
    ]);
  });

  return {
    ...counts,
    progress:
      counts.totalTasks > 0 ? Math.round((counts.completedTasks / counts.totalTasks) * 100) : 100,
    updatedAt: latestUpdateAt,
  };
}

function buildSosAlerts(events) {
  const triggerTypeText = {
    manual: 'Manual SOS request',
    fall: 'Fall detection alert',
    abnormal_vital: 'Abnormal vital sign alert',
  };

  return (events || []).map((event) => {
    const createdAt = toIsoText(event.created_at) || new Date().toISOString();
    const latestStatusChangedAt =
      toIsoText(event.cancelled_at) ||
      toIsoText(event.resolved_at) ||
      toIsoText(event.confirmed_at) ||
      createdAt;

    return {
      id: `sos-${event.id}`,
      type: 'sos',
      title:
        event.event_status === 'triggered'
          ? 'SOS request is active'
          : 'SOS event is waiting for closure',
      message: `${triggerTypeText[event.trigger_type] || 'Emergency alert'}${
        event.address ? ` · ${event.address}` : ''
      }`,
      status: event.event_status,
      createdAt,
      latestStatusChangedAt,
      notificationSummary: null,
      auditTrailSummary: {
        currentStatus: event.event_status,
        triggeredAt: createdAt,
        confirmedAt: toIsoText(event.confirmed_at),
        resolvedAt: toIsoText(event.resolved_at),
        cancelledAt: toIsoText(event.cancelled_at),
      },
      isRead: false,
    };
  });
}

function buildMedicationAlert(medicationSummary) {
  const pendingCount = medicationSummary.pendingTasks + medicationSummary.missedTasks;
  if (pendingCount <= 0) {
    return null;
  }

  return {
    id: `medication-${new Date().toISOString().slice(0, 10)}`,
    type: 'medication',
    title: 'Medication tasks still need confirmation',
    message: `${pendingCount} medication task(s) still need follow-up today.`,
    createdAt: new Date().toISOString(),
    latestStatusChangedAt: medicationSummary.updatedAt,
    notificationSummary: null,
    auditTrailSummary: null,
    isRead: false,
  };
}

function buildLocationSummary(location) {
  return {
    hasLocation: Boolean(location),
    latitude: location ? Number(location.latitude) : null,
    longitude: location ? Number(location.longitude) : null,
    address: location ? location.address || '' : '',
    updatedAt: location ? toIsoText(location.updatedAt) : null,
  };
}

function buildInteractionEvidenceSummary(familyId, evidence) {
  const safeEvidence = evidence || {};
  const voiceMessageCount = Number(safeEvidence.voiceMessageCount || 0);
  const albumCount = Number(safeEvidence.albumCount || 0);
  const pointRecordCount = Number(safeEvidence.pointRecordCount || 0);

  return {
    familyId: Number(familyId),
    voiceMessageCount,
    albumCount,
    pointRecordCount,
    hasInteractionEvidence: voiceMessageCount > 0 || albumCount > 0 || pointRecordCount > 0,
    lastInteractionAt: toIsoText(safeEvidence.lastInteractionAt),
  };
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

    const [snapshot, todayMeds, activeSosEvents, location, interactionEvidence] = await Promise.all(
      [
        familyModel.getLatestHealthSnapshot(selectedElderId),
        medicationLogService.getTodaySchedule(selectedElderId).catch(() => []),
        SosEventModel.listActiveByUser(selectedElderId, 3).catch(() => []),
        familyModel.getLatestLocation(selectedElderId).catch(() => null),
        familySpaceModel.getInteractionEvidenceSummary(familyId).catch(() => null),
      ]
    );

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

    return {
      elderProfile: {
        elderId: selectedElderId,
        familyId,
        name:
          binding.elderProfile.realName ||
          binding.elderProfile.nickname ||
          `User${selectedElderId}`,
        nickname: binding.elderProfile.nickname || null,
        realName: binding.elderProfile.realName || null,
        avatarUrl: binding.elderProfile.avatarUrl || null,
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

    const latestMetrics = {};
    snapshot.latestRecords.forEach((item) => {
      if (!latestMetrics[item.metricType]) {
        latestMetrics[item.metricType] = item;
      }
    });

    return {
      elderId: parsedElderId,
      archive: snapshot.archive,
      latestRecords: snapshot.latestRecords,
      latestMetrics,
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
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createBizError(422, 'Request body must be an object.', 422);
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'healthAlertEnabled')) {
      updates.healthAlertEnabled = normalizeBoolean(
        payload.healthAlertEnabled,
        'healthAlertEnabled'
      );
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'medicationReminderEnabled')) {
      updates.medicationReminderEnabled = normalizeBoolean(
        payload.medicationReminderEnabled,
        'medicationReminderEnabled'
      );
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'sosAlertEnabled')) {
      updates.sosAlertEnabled = normalizeBoolean(payload.sosAlertEnabled, 'sosAlertEnabled');
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'health_alert_enabled')) {
      updates.healthAlertEnabled = normalizeBoolean(
        payload.health_alert_enabled,
        'health_alert_enabled'
      );
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'medication_reminder_enabled')) {
      updates.medicationReminderEnabled = normalizeBoolean(
        payload.medication_reminder_enabled,
        'medication_reminder_enabled'
      );
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'sos_alert_enabled')) {
      updates.sosAlertEnabled = normalizeBoolean(payload.sos_alert_enabled, 'sos_alert_enabled');
    }

    if (Object.keys(updates).length === 0) {
      throw createBizError(422, 'At least one notification field is required.', 422);
    }

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
