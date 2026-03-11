'use strict';

const { query } = require('../config/database');

/**
 * 兼容 query 返回结构（rows 或 [rows, fields]）
 * @param {any} result
 * @returns {any}
 */
function unwrapQueryResult(result) {
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

/**
 * 统一执行查询
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<any>}
 */
async function execute(sql, params) {
  const result = await query(sql, params);
  return unwrapQueryResult(result);
}

/**
 * 统一映射字段
 * @param {object} row
 * @returns {object}
 */
function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    deviceName: row.device_name,
    deviceMac: row.device_mac,
    deviceType: row.device_type,
    isPrimary: row.is_primary === 1,
    batteryLevel: row.battery_level,
    bindStatus: row.bind_status,
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const deviceBindingModel = {
  /**
   * 绑定设备（同一 user + mac 走更新）
   * @param {object} data
   * @returns {Promise<object>}
   */
  async bindDevice(data) {
    const isPrimary = data.isPrimary ? 1 : 0;

    if (isPrimary === 1) {
      await execute(
        `UPDATE device_bindings
         SET is_primary = 0, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [data.userId]
      );
    }

    await execute(
      `INSERT INTO device_bindings
       (user_id, device_name, device_mac, device_type, is_primary, battery_level, bind_status, last_sync_at)
       VALUES (?, ?, ?, ?, ?, ?, 'bound', ?)
       ON DUPLICATE KEY UPDATE
         device_name = VALUES(device_name),
         device_type = VALUES(device_type),
         is_primary = VALUES(is_primary),
         battery_level = VALUES(battery_level),
         bind_status = 'bound',
         updated_at = CURRENT_TIMESTAMP`,
      [
        data.userId,
        data.deviceName,
        data.deviceMac,
        data.deviceType,
        isPrimary,
        data.batteryLevel !== undefined ? data.batteryLevel : null,
        data.lastSyncAt || null,
      ]
    );

    const rows = await execute(
      `SELECT id, user_id, device_name, device_mac, device_type, is_primary, battery_level, bind_status, last_sync_at, created_at, updated_at
       FROM device_bindings
       WHERE user_id = ? AND device_mac = ?
       LIMIT 1`,
      [data.userId, data.deviceMac]
    );

    return rows && rows[0] ? mapRow(rows[0]) : null;
  },

  /**
   * 解绑设备
   * @param {number} userId
   * @param {number} deviceId
   * @returns {Promise<boolean>}
   */
  async unbindDevice(userId, deviceId) {
    const result = await execute(
      `UPDATE device_bindings
       SET bind_status = 'unbound',
           is_primary = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND id = ?`,
      [userId, deviceId]
    );

    return Boolean(result && result.affectedRows > 0);
  },

  /**
   * 列出用户设备
   * @param {number} userId
   * @returns {Promise<object[]>}
   */
  async listDevices(userId) {
    const rows = await execute(
      `SELECT id, user_id, device_name, device_mac, device_type, is_primary, battery_level, bind_status, last_sync_at, created_at, updated_at
       FROM device_bindings
       WHERE user_id = ?
       ORDER BY is_primary DESC, updated_at DESC, id DESC`,
      [userId]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },

  /**
   * 设置主设备
   * @param {number} userId
   * @param {number} deviceId
   * @returns {Promise<boolean>}
   */
  async setPrimary(userId, deviceId) {
    await execute(
      `UPDATE device_bindings
       SET is_primary = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [userId]
    );

    const result = await execute(
      `UPDATE device_bindings
       SET is_primary = 1,
           bind_status = 'bound',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND id = ?`,
      [userId, deviceId]
    );

    return Boolean(result && result.affectedRows > 0);
  },

  /**
   * 查询用户已绑定设备
   * @param {number} userId
   * @param {number} deviceId
   * @returns {Promise<object|null>}
   */
  async findBoundDevice(userId, deviceId) {
    const rows = await execute(
      `SELECT id, user_id, device_name, device_mac, device_type, is_primary, battery_level, bind_status, last_sync_at, created_at, updated_at
       FROM device_bindings
       WHERE user_id = ? AND id = ? AND bind_status = 'bound'
       LIMIT 1`,
      [userId, deviceId]
    );

    return rows && rows[0] ? mapRow(rows[0]) : null;
  },

  /**
   * 更新设备最近同步时间
   * @param {number} userId
   * @param {number} deviceId
   * @param {Date|string} lastSyncAt
   * @returns {Promise<boolean>}
   */
  async updateLastSync(userId, deviceId, lastSyncAt) {
    const result = await execute(
      `UPDATE device_bindings
       SET last_sync_at = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND id = ?`,
      [lastSyncAt, userId, deviceId]
    );

    return Boolean(result && result.affectedRows > 0);
  },
};

module.exports = deviceBindingModel;
