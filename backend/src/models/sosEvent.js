'use strict';

const { query } = require('../config/database');

class SosEventModel {
  /**
   * @description 创建 SOS 紧急求助事件
   * @param {object} payload 求救载荷
   * @param {number} payload.userId 用户ID
   * @param {string} [payload.triggerType='manual'] 触发方式 ('manual' | 'fall')
   * @param {number} [payload.latitude] 纬度
   * @param {number} [payload.longitude] 经度
   * @param {string} [payload.address] 地址描述
   * @param {import('mysql2/promise').PoolConnection} [connection] 可选事务连接
   * @returns {Promise<object>} 返回创建成功的 SOS 事件对象
   */
  static async createEvent(
    { userId, triggerType = 'manual', latitude = null, longitude = null, address = null },
    connection = null
  ) {
    const exec = connection || { query };
    const [result] = await exec.query(
      `INSERT INTO sos_events (user_id, trigger_type, latitude, longitude, address, event_status)
       VALUES (?, ?, ?, ?, ?, 'triggered')`,
      [userId, triggerType, latitude, longitude, address]
    );

    return SosEventModel.findById(result.insertId, connection);
  }

  /**
   * @description 根据事件ID查询 SOS 记录
   * @param {number} eventId 事件ID
   * @param {import('mysql2/promise').PoolConnection} [connection] 可选事务连接
   * @returns {Promise<object|null>} SOS 事件对象或 null
   */
  static async findById(eventId, connection = null) {
    const exec = connection || { query };
    const [rows] = await exec.query(
      `SELECT id, user_id, trigger_type, latitude, longitude, address,
              event_status, created_at, confirmed_at, resolved_at, cancelled_at, updated_at
       FROM sos_events
       WHERE id = ?
       LIMIT 1`,
      [eventId]
    );
    return rows[0] || null;
  }

  /**
   * @description 根据事件ID与所属用户ID查询 SOS 记录
   * @param {number} eventId 事件ID
   * @param {number} userId 用户ID
   * @param {import('mysql2/promise').PoolConnection} [connection] 可选事务连接
   * @returns {Promise<object|null>} SOS 事件对象或 null
   */
  static async findByIdAndUser(eventId, userId, connection = null) {
    const exec = connection || { query };
    const [rows] = await exec.query(
      `SELECT id, user_id, trigger_type, latitude, longitude, address,
              event_status, created_at, confirmed_at, resolved_at, cancelled_at, updated_at
       FROM sos_events
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [eventId, userId]
    );
    return rows[0] || null;
  }

  /**
   * @description 原子流转 SOS 事件状态（带乐观锁防重入）
   * @param {number} eventId 事件ID
   * @param {number} userId 所属用户ID
   * @param {string} fromStatus 原状态
   * @param {string} toStatus 目标状态
   * @param {import('mysql2/promise').PoolConnection} [connection] 可选事务连接
   * @returns {Promise<boolean>} 是否流转成功
   */
  static async transitionStatus(eventId, userId, fromStatus, toStatus, connection = null) {
    const exec = connection || { query };
    const [result] = await exec.query(
      `UPDATE sos_events
       SET event_status = ?,
           confirmed_at = CASE WHEN ? = 'confirmed' THEN NOW() ELSE confirmed_at END,
           resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE resolved_at END,
           cancelled_at = CASE WHEN ? = 'cancelled' THEN NOW() ELSE cancelled_at END,
           updated_at = NOW()
       WHERE id = ? AND user_id = ? AND event_status = ?`,
      [toStatus, toStatus, toStatus, toStatus, eventId, userId, fromStatus]
    );

    return result.affectedRows > 0;
  }

  static async countByUser(userId, status = null) {
    let sql = 'SELECT COUNT(1) AS total FROM sos_events WHERE user_id = ?';
    const params = [userId];

    if (status) {
      sql += ' AND event_status = ?';
      params.push(status);
    }

    const [rows] = await query(sql, params);
    return rows[0] ? rows[0].total : 0;
  }

  static async listByUser(userId, { page = 1, pageSize = 10, status = null } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const offset = (safePage - 1) * safePageSize;

    let sql = `SELECT id, user_id, trigger_type, latitude, longitude, address,
                      event_status, created_at, confirmed_at, resolved_at, cancelled_at, updated_at
               FROM sos_events
               WHERE user_id = ?`;
    const params = [userId];

    if (status) {
      sql += ' AND event_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(safePageSize, offset);

    const [rows] = await query(sql, params);
    return rows;
  }

  static async listActiveByUser(userId, limit = 3) {
    const safeLimit = Math.min(20, Math.max(1, Number(limit) || 3));
    const [rows] = await query(
      `SELECT id, user_id, trigger_type, latitude, longitude, address,
              event_status, created_at, confirmed_at, resolved_at, cancelled_at, updated_at
       FROM sos_events
       WHERE user_id = ?
         AND event_status IN ('triggered', 'confirmed')
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, safeLimit]
    );

    return rows;
  }

  static async autoResolveTimeoutEvents(timeoutMinutes) {
    const safeTimeout = Math.max(1, Number(timeoutMinutes) || 30);

    const [result] = await query(
      `UPDATE sos_events
       SET event_status = 'resolved',
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE event_status IN ('triggered', 'confirmed')
         AND created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [safeTimeout]
    );

    return result.affectedRows || 0;
  }
}

module.exports = SosEventModel;
