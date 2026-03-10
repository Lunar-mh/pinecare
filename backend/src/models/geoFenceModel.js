'use strict';

const { query } = require('../config/db');

/**
 * 兼容 query 返回结构
 * @param {any} result
 * @returns {any}
 */
function unwrap(result) {
  return Array.isArray(result) ? result[0] : result;
}

/**
 * 执行 SQL 并解包
 * @param {string} sql
 * @param {Array<any>} params
 * @returns {Promise<any>}
 */
async function execute(sql, params) {
  return unwrap(await query(sql, params));
}

/**
 * 安全解析围栏点位 JSON
 * @param {string|Array|null} points
 * @returns {Array}
 */
function parsePoints(points) {
  if (!points) {
    return [];
  }
  if (Array.isArray(points)) {
    return points;
  }
  try {
    return JSON.parse(points);
  } catch (error) {
    return [];
  }
}

/**
 * 行数据转换
 * @param {object} row
 * @returns {object}
 */
function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    fenceType: row.fence_type,
    centerLat: row.center_lat !== null ? Number(row.center_lat) : null,
    centerLng: row.center_lng !== null ? Number(row.center_lng) : null,
    radius: row.radius !== null ? Number(row.radius) : null,
    points: parsePoints(row.points),
    alertType: row.alert_type,
    isActive: Number(row.is_active) === 1,
    createdAt: row.created_at,
  };
}

const geoFenceModel = {
  /**
   * 创建围栏
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async create(payload) {
    const result = await execute(
      `INSERT INTO geo_fences
       (user_id, name, fence_type, center_lat, center_lng, radius, points, alert_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.userId,
        payload.name,
        payload.fenceType,
        payload.centerLat !== undefined ? payload.centerLat : null,
        payload.centerLng !== undefined ? payload.centerLng : null,
        payload.radius !== undefined ? payload.radius : null,
        payload.points ? JSON.stringify(payload.points) : null,
        payload.alertType || 'both',
        payload.isActive === false ? 0 : 1,
      ]
    );

    return {
      id: result.insertId,
      userId: payload.userId,
      name: payload.name,
      fenceType: payload.fenceType,
      centerLat: payload.centerLat !== undefined ? Number(payload.centerLat) : null,
      centerLng: payload.centerLng !== undefined ? Number(payload.centerLng) : null,
      radius: payload.radius !== undefined ? Number(payload.radius) : null,
      points: payload.points || [],
      alertType: payload.alertType || 'both',
      isActive: payload.isActive !== false,
      createdAt: new Date(),
    };
  },

  /**
   * 查询用户围栏列表
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async listByUserId(userId) {
    const rows = await execute(
      `SELECT id, user_id, name, fence_type, center_lat, center_lng, radius, points, alert_type, is_active, created_at
       FROM geo_fences
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },

  /**
   * 查询用户启用中的围栏
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async getActiveByUserId(userId) {
    const rows = await execute(
      `SELECT id, user_id, name, fence_type, center_lat, center_lng, radius, points, alert_type, is_active, created_at
       FROM geo_fences
       WHERE user_id = ? AND is_active = 1
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },
};

module.exports = geoFenceModel;
