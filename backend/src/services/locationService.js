'use strict';

const locationRecordModel = require('../models/locationRecordModel');
const geoFenceModel = require('../models/geoFenceModel');
const fenceAlertModel = require('../models/fenceAlertModel');
const locationCacheService = require('./locationCacheService');
const { checkFenceViolation, isInsideFence } = require('../utils/geoFenceMath');

const VALID_LOCATION_TYPES = ['gps', 'wifi', '基站'];

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
 * 校验并标准化上传位置
 * @param {object} payload
 * @returns {{latitude:number, longitude:number, accuracy:number|null, locationType:string}}
 */
function normalizeLocationPayload(payload) {
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const accuracy = payload.accuracy !== undefined ? Number(payload.accuracy) : null;
  const locationType = payload.locationType ? String(payload.locationType) : 'gps';

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw createBizError(400, 'latitude 参数非法', 400);
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw createBizError(400, 'longitude 参数非法', 400);
  }

  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
    throw createBizError(400, 'accuracy 参数非法', 400);
  }

  if (!VALID_LOCATION_TYPES.includes(locationType)) {
    throw createBizError(400, 'locationType 仅支持 gps/wifi/基站', 400);
  }

  return {
    latitude,
    longitude,
    accuracy,
    locationType,
  };
}

/**
 * 基于上一位置计算围栏进出并落告警
 * @param {number} userId
 * @param {{latitude:number, longitude:number}} location
 * @param {{latitude:number, longitude:number}|null} previousLocation
 * @returns {Promise<object[]>}
 */
async function handleFenceAlerts(userId, location, previousLocation) {
  const activeFences = await geoFenceModel.getActiveByUserId(userId);

  if (!Array.isArray(activeFences) || activeFences.length === 0 || !previousLocation) {
    return [];
  }

  const alerts = [];
  for (const fence of activeFences) {
    const previousInside = isInsideFence(previousLocation, fence);
    const result = checkFenceViolation(location, {
      ...fence,
      lastInside: previousInside,
    });

    if (result.violated && result.alertType) {
      const alert = await fenceAlertModel.create({
        fenceId: fence.id,
        userId,
        alertType: result.alertType,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

const locationService = {
  /**
   * 上传位置：写 MySQL + 写 Redis + 围栏检查
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async upload(userId, payload) {
    const normalized = normalizeLocationPayload(payload || {});

    let previousLocation = null;
    try {
      previousLocation = await locationCacheService.getCurrentLocation(userId);
    } catch (error) {
      previousLocation = await locationRecordModel.getLatest(userId);
    }

    const record = await locationRecordModel.insert({
      userId,
      ...normalized,
    });

    const currentLocation = {
      userId,
      latitude: record.latitude,
      longitude: record.longitude,
      accuracy: record.accuracy,
      locationType: record.locationType,
      createdAt: record.createdAt,
    };

    try {
      await locationCacheService.setCurrentLocation(userId, currentLocation);
    } catch (error) {
      // 缓存失败时不阻断主链路
    }

    const alerts = await handleFenceAlerts(userId, currentLocation, previousLocation);

    return {
      location: currentLocation,
      alerts,
    };
  },

  /**
   * 查询当前位置：优先 Redis，失败回退 MySQL
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async getCurrent(userId) {
    try {
      const cached = await locationCacheService.getCurrentLocation(userId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // 缓存读取失败降级数据库
    }

    const latest = await locationRecordModel.getLatest(userId);
    if (!latest) {
      return null;
    }

    const currentLocation = {
      userId,
      latitude: latest.latitude,
      longitude: latest.longitude,
      accuracy: latest.accuracy,
      locationType: latest.locationType,
      createdAt: latest.createdAt,
    };

    try {
      await locationCacheService.setCurrentLocation(userId, currentLocation);
    } catch (error) {
      // 缓存写入失败不影响返回
    }

    return currentLocation;
  },
};

module.exports = locationService;
