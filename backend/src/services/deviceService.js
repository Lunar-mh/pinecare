'use strict';

const deviceBindingModel = require('../models/deviceBindingModel');
const { createBizError } = require('../utils/serviceError');

/**
 * 创建业务错误
 * @param {number} code
 * @param {string} message
 * @param {number} [statusCode]
 * @returns {Error}
 */

/**
 * 解析设备 ID
 * @param {any} value
 * @param {string} fieldName
 * @returns {number}
 */
function parseDeviceId(value, fieldName) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createBizError(400, `${fieldName} 非法`, 400);
  }
  return id;
}

const deviceService = {
  /**
   * 绑定设备
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async bind(userId, payload) {
    const deviceName = String(payload.device_name || payload.deviceName || '').trim();
    const deviceMac = String(payload.device_mac || payload.deviceMac || '').trim();
    const deviceType = String(payload.device_type || payload.deviceType || '').trim();

    if (!deviceName || !deviceMac || !deviceType) {
      throw createBizError(400, 'device_name、device_mac、device_type 不能为空', 400);
    }

    const batteryRaw = payload.battery_level !== undefined ? payload.battery_level : payload.batteryLevel;
    const batteryLevel = batteryRaw === undefined || batteryRaw === null || batteryRaw === ''
      ? null
      : Number(batteryRaw);

    if (batteryLevel !== null && (!Number.isFinite(batteryLevel) || batteryLevel < 0 || batteryLevel > 100)) {
      throw createBizError(400, 'battery_level 必须在 0-100 之间', 400);
    }

    const device = await deviceBindingModel.bindDevice({
      userId,
      deviceName,
      deviceMac,
      deviceType,
      isPrimary: Boolean(payload.is_primary !== undefined ? payload.is_primary : payload.isPrimary),
      batteryLevel,
      lastSyncAt: payload.last_sync_at || payload.lastSyncAt || null,
    });

    return {
      device,
    };
  },

  /**
   * 解绑设备
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async unbind(userId, payload) {
    const deviceId = parseDeviceId(payload.device_id || payload.deviceId, 'device_id');
    const success = await deviceBindingModel.unbindDevice(userId, deviceId);

    if (!success) {
      throw createBizError(404, '设备不存在或已解绑', 404);
    }

    return { deviceId, unbound: true };
  },

  /**
   * 查询设备列表
   * @param {number} userId
   * @returns {Promise<object>}
   */
  async list(userId) {
    const list = await deviceBindingModel.listDevices(userId);
    return { list };
  },

  /**
   * 设置主设备
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async setPrimary(userId, payload) {
    const deviceId = parseDeviceId(payload.device_id || payload.deviceId, 'device_id');
    const success = await deviceBindingModel.setPrimary(userId, deviceId);

    if (!success) {
      throw createBizError(404, '目标设备不存在', 404);
    }

    const list = await deviceBindingModel.listDevices(userId);
    return {
      deviceId,
      list,
    };
  },
};

module.exports = deviceService;
