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
 * 执行 SQL 并解包
 * @param {string} sql
 * @param {Array<any>} params
 * @returns {Promise<any>}
 */
async function execute(sql, params) {
  return unwrap(await query(sql, params));
}

/**
 * 行数据转换
 * @param {object} row
 * @returns {object}
 */
function mapRow(row) {
  return {
    id: row.id,
    fenceId: row.fence_id,
    userId: row.user_id,
    alertType: row.alert_type,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    isHandled: Number(row.is_handled) === 1,
    createdAt: row.created_at,
  };
}

const fenceAlertModel = {
  /**
   * 创建围栏告警
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async create(payload) {
    const result = await execute(
      `INSERT INTO fence_alerts
       (fence_id, user_id, alert_type, latitude, longitude, is_handled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.fenceId,
        payload.userId,
        payload.alertType,
        payload.latitude,
        payload.longitude,
        payload.isHandled === true ? 1 : 0,
      ]
    );

    return {
      id: result.insertId,
      fenceId: payload.fenceId,
      userId: payload.userId,
      alertType: payload.alertType,
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      isHandled: payload.isHandled === true,
      createdAt: new Date(),
    };
  },

  /**
   * 按用户查询告警列表
   * @param {number} userId
   * @param {boolean|null} isHandled
   * @returns {Promise<object[]>}
   */
  async listByUserId(userId, isHandled) {
    const params = [userId];
    let whereSql = 'WHERE user_id = ?';

    if (typeof isHandled === 'boolean') {
      whereSql += ' AND is_handled = ?';
      params.push(isHandled ? 1 : 0);
    }

    const rows = await execute(
      `SELECT id, fence_id, user_id, alert_type, latitude, longitude, is_handled, created_at
       FROM fence_alerts
       ${whereSql}
       ORDER BY created_at DESC, id DESC`,
      params
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },
};

module.exports = fenceAlertModel;
