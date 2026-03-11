'use strict';

const familyModel = require('../models/family');
const SosEventModel = require('../models/sosEvent');
const medicationLogService = require('./medicationLogService');

const DEFAULT_NOTIFICATION_SETTINGS = {
  healthAlertEnabled: true,
  medicationReminderEnabled: true,
  sosAlertEnabled: true,
};

/**
 * 创建业务错误
 * @param {number} code
 * @param {string} message
 * @param {number} [statusCode]
 * @returns {Error}
 */
function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

/**
 * 规范化并校验老人 ID
 * @param {any} elderId
 * @returns {number}
 */
function normalizeElderId(elderId) {
  const parsed = Number(elderId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(422, 'elderId 必须为正整数', 422);
  }
  return parsed;
}

/**
 * 布尔值归一化
 * @param {any} value
 * @param {string} fieldName
 * @returns {boolean}
 */
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

  throw createBizError(422, `${fieldName} 必须为布尔值`, 422);
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
  return values
    .map((item) => (item ? new Date(item).getTime() : NaN))
    .filter((item) => !Number.isNaN(item))
    .sort((a, b) => b - a)[0];
}

function getMedicationProgress(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return 100;
  }

  const completed = list.filter((item) => item.status === 'taken').length;
  return Math.round((completed / list.length) * 100);
}

function buildSosAlerts(events) {
  const triggerTypeText = {
    manual: '手动求助',
    fall: '跌倒告警',
    abnormal_vital: '指标异常',
  };

  return (events || []).map((event) => ({
    id: `sos-${event.id}`,
    type: 'sos',
    title: event.event_status === 'triggered' ? 'SOS 紧急求助进行中' : 'SOS 事件等待处理闭环',
    message: `${triggerTypeText[event.trigger_type] || '紧急求助'}${event.address ? ` · ${event.address}` : ''}`,
    createdAt: toIsoText(event.created_at) || new Date().toISOString(),
    isRead: false,
  }));
}

function buildMedicationAlert(todayMeds) {
  const pendingCount = (todayMeds || []).filter(
    (item) => item.status === 'pending' || item.status === 'missed'
  ).length;

  if (pendingCount <= 0) {
    return null;
  }

  return {
    id: `medication-${new Date().toISOString().slice(0, 10)}`,
    type: 'medication',
    title: '今日用药仍待确认',
    message: `还有 ${pendingCount} 次用药待确认，建议尽快联系长辈确认。`,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
}

const familyService = {
  /**
   * 获取家属绑定列表
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async getFamilyBindings(userId) {
    return familyModel.listBindingsByFamilyId(Number(userId));
  },

  /**
   * 获取家属端首个绑定老人的总览信息
   * @param {number} userId 家属用户ID
   * @returns {Promise<object|null>}
   */
  async getElderlyOverview(userId) {
    const bindings = await familyModel.listBindingsByFamilyId(Number(userId));
    if (!bindings || bindings.length === 0) {
      return null;
    }
    const binding = bindings[0];
    const elderId = binding.elderId;

    // 获取健康快照
    const [snapshot, todayMeds, activeSosEvents] = await Promise.all([
      familyModel.getLatestHealthSnapshot(elderId),
      medicationLogService.getTodaySchedule(elderId).catch(() => []),
      SosEventModel.listActiveByUser(elderId, 3).catch(() => []),
    ]);
    const latestRecords = snapshot ? snapshot.latestRecords : [];

    // 提取血压和心率
    let bloodPressure = null;
    let heartRate = null;

    for (const rec of latestRecords) {
      if (!bloodPressure && rec.metricType === 'blood_pressure') {
        bloodPressure = {
          id: String(rec.id),
          systolic: rec.valueHigh != null ? rec.valueHigh : 0,
          diastolic: rec.valueLow != null ? rec.valueLow : 0,
          measuredAt: rec.measuredAt,
          status: (rec.valueHigh > 140 || rec.valueLow > 90) ? 'warning' : 'normal',
        };
      }
      if (!heartRate && rec.metricType === 'heart_rate') {
        const val = Number(rec.value);
        heartRate = {
          id: String(rec.id),
          value: val,
          measuredAt: rec.measuredAt,
          status: (val < 60 || val > 100) ? 'warning' : 'normal',
        };
      }
    }

    // 获取GPS位置（如果表存在）
    let location = null;
    try {
      const locRow = await familyModel.getLatestLocation(elderId);
      if (locRow) location = locRow;
    } catch (_) {
      // GPS表可能不存在，默认返回 null
    }

    const medicationProgress = getMedicationProgress(todayMeds);
    const alerts = buildSosAlerts(activeSosEvents);
    const medicationAlert = buildMedicationAlert(todayMeds);
    if (medicationAlert) {
      alerts.push(medicationAlert);
    }

    const latestActiveTime = pickLatestTime([
      snapshot && snapshot.archive ? snapshot.archive.updatedAt : null,
      location ? location.updatedAt : null,
      activeSosEvents[0] ? activeSosEvents[0].created_at : null,
    ]);
    const lastActiveAt = Number.isFinite(latestActiveTime)
      ? new Date(latestActiveTime).toISOString()
      : null;

    return {
      elderlyId: String(elderId),
      name: binding.elderProfile.realName || binding.elderProfile.nickname || '未知用户',
      avatar: binding.elderProfile.avatarUrl || null,
      isOnline: isRecentWithinHours(lastActiveAt, 24),
      lastActiveAt,
      location,
      todayHealth: {
        bloodPressure,
        heartRate,
        medicationProgress,
      },
      alerts,
    };
  },

  /**
   * 获取老人健康数据（先校验绑定关系）
   * @param {number} userId
   * @param {any} elderId
   * @returns {Promise<object>}
   */
  async getElderHealth(userId, elderId) {
    const parsedElderId = normalizeElderId(elderId);
    const allowed = await familyModel.checkFamilyBinding(Number(userId), parsedElderId);

    if (!allowed) {
      throw createBizError(403, '无权访问该老人健康数据', 403);
    }

    const snapshot = await familyModel.getLatestHealthSnapshot(parsedElderId);
    if (!snapshot) {
      throw createBizError(404, '未找到该老人的健康档案', 404);
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

  /**
   * 查询通知设置（无记录时返回默认值）
   * @param {number} userId
   * @returns {Promise<object>}
   */
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

  /**
   * 更新通知设置（字段白名单 + 布尔归一化）
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async updateNotificationSettings(userId, payload = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw createBizError(422, '请求体必须为对象', 422);
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'healthAlertEnabled')) {
      updates.healthAlertEnabled = normalizeBoolean(payload.healthAlertEnabled, 'healthAlertEnabled');
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
      updates.healthAlertEnabled = normalizeBoolean(payload.health_alert_enabled, 'health_alert_enabled');
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
      throw createBizError(422, '至少提供一个可更新的通知设置字段', 422);
    }

    const current = await this.getNotificationSettings(Number(userId));
    const merged = {
      healthAlertEnabled: updates.healthAlertEnabled ?? current.healthAlertEnabled,
      medicationReminderEnabled: updates.medicationReminderEnabled ?? current.medicationReminderEnabled,
      sosAlertEnabled: updates.sosAlertEnabled ?? current.sosAlertEnabled,
    };

    const saved = await familyModel.upsertNotificationSettings(Number(userId), merged);
    return saved || { userId: Number(userId), ...merged };
  },
};

module.exports = familyService;
