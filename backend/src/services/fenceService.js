'use strict';

const geoFenceModel = require('../models/geoFenceModel');

const VALID_FENCE_TYPES = ['circle', 'polygon'];
const VALID_ALERT_TYPES = ['enter', 'exit', 'both'];

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
 * 校验经纬度范围
 * @param {number} lat
 * @param {number} lng
 */
function ensureLatLng(lat, lng) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw createBizError(400, '纬度超出范围', 400);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw createBizError(400, '经度超出范围', 400);
  }
}

const fenceService = {
  /**
   * 查询用户围栏列表
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async list(userId) {
    return geoFenceModel.listByUserId(userId);
  },

  /**
   * 创建围栏
   * @param {number} userId
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async create(userId, payload) {
    const name = payload && payload.name ? String(payload.name).trim() : '';
    const fenceType = payload && payload.fenceType ? String(payload.fenceType) : '';
    const alertType = payload && payload.alertType ? String(payload.alertType) : 'both';

    if (!name) {
      throw createBizError(400, '围栏名称不能为空', 400);
    }

    if (!VALID_FENCE_TYPES.includes(fenceType)) {
      throw createBizError(400, 'fenceType 仅支持 circle 或 polygon', 400);
    }

    if (!VALID_ALERT_TYPES.includes(alertType)) {
      throw createBizError(400, 'alertType 仅支持 enter/exit/both', 400);
    }

    if (fenceType === 'circle') {
      const centerLat = Number(payload.centerLat);
      const centerLng = Number(payload.centerLng);
      const radius = Number(payload.radius);

      ensureLatLng(centerLat, centerLng);

      if (!Number.isFinite(radius) || radius <= 0) {
        throw createBizError(400, '圆形围栏半径必须为正数', 400);
      }

      return geoFenceModel.create({
        userId,
        name,
        fenceType,
        centerLat,
        centerLng,
        radius: Math.floor(radius),
        alertType,
        isActive: payload.isActive !== false,
      });
    }

    const points = Array.isArray(payload.points) ? payload.points : [];
    if (points.length < 3) {
      throw createBizError(400, '多边形围栏至少需要 3 个点', 400);
    }

    const normalizedPoints = points.map((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      ensureLatLng(lat, lng);
      return { lat, lng };
    });

    return geoFenceModel.create({
      userId,
      name,
      fenceType,
      points: normalizedPoints,
      alertType,
      isActive: payload.isActive !== false,
    });
  },
};

module.exports = fenceService;
