'use strict';

const familyModel = require('../models/family');

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
    const snapshot = await familyModel.getLatestHealthSnapshot(elderId);
    const latestRecords = snapshot ? snapshot.latestRecords : [];

    // 提取血压和心率
    let bloodPressure = null;
    let heartRate = null;
    const medicationProgress = 0;

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

    return {
      elderlyId: String(elderId),
      name: binding.elderProfile.realName || binding.elderProfile.nickname || '未知用户',
      avatar: binding.elderProfile.avatarUrl || null,
      isOnline: false,
      lastActiveAt: snapshot && snapshot.archive ? snapshot.archive.updatedAt : null,
      location,
      todayHealth: {
        bloodPressure,
        heartRate,
        medicationProgress,
      },
      alerts: [],
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
