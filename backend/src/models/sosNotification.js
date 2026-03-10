'use strict';

const { query } = require('../config/database');

class SosNotificationModel {
  static async batchCreate(records) {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const placeholders = records.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = [];

    records.forEach((item) => {
      params.push(
        item.sos_event_id,
        item.contact_id,
        item.contact_name,
        item.notify_type,
        item.notify_target || null,
        item.status || 'pending',
        item.retry_count || 0
      );
    });

    const [result] = await query(
      `INSERT INTO sos_notifications (
         sos_event_id, contact_id, contact_name, notify_type, notify_target, status, retry_count
       ) VALUES ${placeholders}`,
      params
    );

    const startId = Number(result.insertId);
    const count = Number(result.affectedRows) || 0;
    const ids = [];
    for (let i = 0; i < count; i += 1) {
      ids.push(startId + i);
    }

    return ids;
  }

  static async findById(notificationId) {
    const [rows] = await query(
      `SELECT id, sos_event_id, contact_id, contact_name, notify_type, notify_target,
              status, retry_count, error_message, sent_at, created_at, updated_at
       FROM sos_notifications
       WHERE id = ?
       LIMIT 1`,
      [notificationId]
    );

    return rows[0] || null;
  }

  static async updateStatus(notificationId, status, options = {}) {
    const retryDelta = options.incrementRetry ? 1 : 0;
    const errorMessage = options.errorMessage || null;

    await query(
      `UPDATE sos_notifications
       SET status = ?,
           retry_count = retry_count + ?,
           error_message = ?,
           sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE sent_at END,
           updated_at = NOW()
       WHERE id = ?`,
      [status, retryDelta, errorMessage, status, notificationId]
    );
  }

  static async listByEventId(eventId) {
    const [rows] = await query(
      `SELECT id, sos_event_id, contact_id, contact_name, notify_type, notify_target,
              status, retry_count, error_message, sent_at, created_at, updated_at
       FROM sos_notifications
       WHERE sos_event_id = ?
       ORDER BY id ASC`,
      [eventId]
    );

    return rows;
  }

  static async summarizeByEventIds(eventIds) {
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return [];
    }

    const placeholders = eventIds.map(() => '?').join(', ');
    const [rows] = await query(
      `SELECT sos_event_id,
              notify_type,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
              SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count
       FROM sos_notifications
       WHERE sos_event_id IN (${placeholders})
       GROUP BY sos_event_id, notify_type`,
      eventIds
    );

    return rows;
  }
}

module.exports = SosNotificationModel;
