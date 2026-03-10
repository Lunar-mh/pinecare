'use strict';

const { query } = require('../config/database');

class SosEventModel {
  static async createEvent({ userId, triggerType = 'manual', latitude = null, longitude = null, address = null }) {
    const [result] = await query(
      `INSERT INTO sos_events (user_id, trigger_type, latitude, longitude, address, event_status)
       VALUES (?, ?, ?, ?, ?, 'triggered')`,
      [userId, triggerType, latitude, longitude, address]
    );

    return SosEventModel.findById(result.insertId);
  }

  static async findById(eventId) {
    const [rows] = await query(
      `SELECT id, user_id, trigger_type, latitude, longitude, address,
              event_status, created_at, confirmed_at, resolved_at, cancelled_at, updated_at
       FROM sos_events
       WHERE id = ?
       LIMIT 1`,
      [eventId]
    );
    return rows[0] || null;
  }

  static async findByIdAndUser(eventId, userId) {
    const [rows] = await query(
      `SELECT id, user_id, trigger_type, latitude, longitude, address,
              event_status, created_at, confirmed_at, resolved_at, cancelled_at, updated_at
       FROM sos_events
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [eventId, userId]
    );
    return rows[0] || null;
  }

  static async transitionStatus(eventId, userId, fromStatus, toStatus) {
    const [result] = await query(
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
