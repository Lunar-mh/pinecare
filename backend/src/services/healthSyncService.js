'use strict';

const healthRecordModel = require('../models/healthRecordModel');
const deviceBindingModel = require('../models/deviceBindingModel');
const { collectAlerts } = require('../utils/healthAlert');
const { createBizError } = require('../utils/serviceError');

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

/**
 * 解析血压字符串（如 140/90）
 * @param {string} value
 * @returns {{valueHigh:number|null,valueLow:number|null}}
 */
function parseBloodPressureValue(value) {
  const text = String(value || '').trim();
  const match = text.match(/(\d{2,3})\s*[\/-]\s*(\d{2,3})/);
  if (!match) {
    return { valueHigh: null, valueLow: null };
  }

  const high = Number(match[1]);
  const low = Number(match[2]);

  return {
    valueHigh: Number.isFinite(high) ? high : null,
    valueLow: Number.isFinite(low) ? low : null,
  };
}

/**
 * 标准化并校验同步记录
 * @param {number} userId
 * @param {number} fallbackDeviceId
 * @param {object[]} records
 * @returns {object[]}
 */
function normalizeRecords(userId, fallbackDeviceId, records) {
  return records.map((item, index) => {
    const metricType = String(item.metric_type || item.metricType || '').trim();
    if (!VALID_METRIC_TYPES.includes(metricType)) {
      throw createBizError(400, `第 ${index + 1} 条 metric_type 非法`, 400);
    }

    const value = item.value;
    if (value === undefined || value === null || value === '') {
      throw createBizError(400, `第 ${index + 1} 条 value 不能为空`, 400);
    }

    const deviceIdRaw = item.device_id !== undefined ? item.device_id : item.deviceId;
    const deviceId = Number(deviceIdRaw !== undefined ? deviceIdRaw : fallbackDeviceId);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      throw createBizError(400, `第 ${index + 1} 条 device_id 非法`, 400);
    }

    const measuredAt = item.measured_at || item.measuredAt || new Date();
    const syncedAt = item.synced_at || item.syncedAt || new Date();

    let valueHigh = item.value_high !== undefined ? item.value_high : item.valueHigh;
    let valueLow = item.value_low !== undefined ? item.value_low : item.valueLow;

    if (metricType === 'blood_pressure' && (valueHigh === undefined || valueLow === undefined)) {
      const parsed = parseBloodPressureValue(value);
      valueHigh = parsed.valueHigh;
      valueLow = parsed.valueLow;
    }

    return {
      userId,
      metricType,
      value,
      valueHigh: valueHigh !== undefined ? valueHigh : null,
      valueLow: valueLow !== undefined ? valueLow : null,
      source: 'device',
      deviceId,
      measuredAt,
      syncedAt,
    };
  });
}

const healthSyncService = {
  /**
   * 手环数据同步
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async sync(userId, payload) {
    const records = Array.isArray(payload.records) ? payload.records : [];
    if (records.length === 0) {
      throw createBizError(400, 'records 不能为空数组', 400);
    }

    const fallbackDeviceId = Number(payload.device_id || payload.deviceId || 0);
    const normalizedRecords = normalizeRecords(userId, fallbackDeviceId, records);

    const uniqueDeviceIds = [...new Set(normalizedRecords.map((item) => item.deviceId))];

    for (const deviceId of uniqueDeviceIds) {
      const boundDevice = await deviceBindingModel.findBoundDevice(userId, deviceId);
      if (!boundDevice) {
        throw createBizError(403, `设备 ${deviceId} 未绑定或已解绑`, 403);
      }
    }

    const insertedCount = await healthRecordModel.batchInsert(normalizedRecords);
    const syncTime = new Date();

    await Promise.all(
      uniqueDeviceIds.map((deviceId) => deviceBindingModel.updateLastSync(userId, deviceId, syncTime))
    );

    return {
      insertedCount,
      syncedAt: syncTime,
      deviceIds: uniqueDeviceIds,
      alerts: collectAlerts(normalizedRecords),
    };
  },
};

module.exports = healthSyncService;
