'use strict';

const { query } = require('../config/database');

/**
 * 兼容 query 返回结构
 * @param {any} result
 * @returns {any}
 */
function unwrap(result) {
  return Array.isArray(result) ? result[0] : result;
}

/**
 * 执行 SQL 并解包结果
 * @param {string} sql
 * @param {Array<any>} params
 * @returns {Promise<any>}
 */
async function execute(sql, params) {
  return unwrap(await query(sql, params));
}

/**
 * 行数据转业务字段
 * @param {object} row
 * @returns {object}
 */
function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: row.accuracy !== null ? Number(row.accuracy) : null,
    locationType: row.location_type,
    createdAt: row.created_at,
  };
}

const locationRecordModel = {
  /**
   * 写入位置记录
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async insert(payload) {
    const result = await execute(
      `INSERT INTO location_records
       (user_id, latitude, longitude, accuracy, location_type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        payload.userId,
        payload.latitude,
        payload.longitude,
        payload.accuracy !== undefined ? payload.accuracy : null,
        payload.locationType || 'gps',
      ]
    );

    return {
      id: result.insertId,
      userId: payload.userId,
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      accuracy: payload.accuracy !== undefined ? Number(payload.accuracy) : null,
      locationType: payload.locationType || 'gps',
      createdAt: new Date(),
    };
  },

  /**
   * 查询用户最新位置
   * @param {number} userId
   * @returns {Promise<object|null>}
   */
  async getLatest(userId) {
    const rows = await execute(
      `SELECT id, user_id, latitude, longitude, accuracy, location_type, created_at
       FROM location_records
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  },

  /**
   * 按时间范围查询轨迹
   * @param {number} userId
   * @param {Date|string} startDate
   * @param {Date|string} endDate
   * @param {number} limit
   * @returns {Promise<object[]>}
   */
  async getByTimeRange(userId, startDate, endDate, limit) {
    const rows = await execute(
      `SELECT id, user_id, latitude, longitude, accuracy, location_type, created_at
       FROM location_records
       WHERE user_id = ?
         AND created_at >= ?
         AND created_at <= ?
       ORDER BY created_at ASC, id ASC
       LIMIT ?`,
      [userId, startDate, endDate, limit]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },
};

module.exports = locationRecordModel;
