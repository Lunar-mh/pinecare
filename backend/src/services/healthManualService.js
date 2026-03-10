'use strict';

const healthRecordModel = require('../models/healthRecordModel');
const { evaluateRecord } = require('../utils/healthAlert');

const VALID_METRIC_TYPES = [
  'blood_pressure',
  'heart_rate',
  'blood_oxygen',
  'steps',
  'sleep',
  'blood_sugar',
  'temperature',
];

/**
 * 创建业务错误
 * @param {number} code
 * @param {string} message
 * @param {number} [statusCode]
 * @returns {Error}
 */
function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

/**
 * 解析血压字符串（如 138/88）
 * @param {string} value
 * @returns {{valueHigh:number|null,valueLow:number|null}}
 */
function parseBloodPressureValue(value) {
  const text = String(value || '').trim();
  const match = text.match(/(\d{2,3})\s*[\/-]\s*(\d{2,3})/);
  if (!match) {
    return { valueHigh: null, valueLow: null };
  }

  const valueHigh = Number(match[1]);
  const valueLow = Number(match[2]);

  return {
    valueHigh: Number.isFinite(valueHigh) ? valueHigh : null,
    valueLow: Number.isFinite(valueLow) ? valueLow : null,
  };
}

const healthManualService = {
  /**
   * 手动录入健康数据
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async createManualRecord(userId, payload) {
    const metricType = String(payload.metric_type || payload.metricType || '').trim();
    const value = payload.value;

    if (!metricType) {
      throw createBizError(400, 'metric_type 不能为空', 400);
    }
    if (!VALID_METRIC_TYPES.includes(metricType)) {
      throw createBizError(400, 'metric_type 非法', 400);
    }
    if (value === undefined || value === null || value === '') {
      throw createBizError(400, 'value 不能为空', 400);
    }

    let valueHigh = payload.value_high !== undefined ? payload.value_high : payload.valueHigh;
    let valueLow = payload.value_low !== undefined ? payload.value_low : payload.valueLow;

    if (metricType === 'blood_pressure' && (valueHigh === undefined || valueLow === undefined)) {
      const parsed = parseBloodPressureValue(value);
      valueHigh = parsed.valueHigh;
      valueLow = parsed.valueLow;
    }

    const measuredAt = payload.measured_at || payload.measuredAt || new Date();
    const syncedAt = payload.synced_at || payload.syncedAt || new Date();

    const record = await healthRecordModel.insertManual({
      userId,
      metricType,
      value,
      valueHigh: valueHigh !== undefined ? valueHigh : null,
      valueLow: valueLow !== undefined ? valueLow : null,
      deviceId: payload.device_id || payload.deviceId || null,
      measuredAt,
      syncedAt,
    });

    const alertResult = evaluateRecord(record);

    return {
      record,
      alert: alertResult.isAlert
        ? {
            isAlert: true,
            reasons: alertResult.reasons,
          }
        : {
            isAlert: false,
            reasons: [],
          },
    };
  },
};

module.exports = healthManualService;
