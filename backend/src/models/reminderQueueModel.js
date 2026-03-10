'use strict';

const { query } = require('../config/database');

function mapQueueRow(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    plan_id: row.plan_id === null ? null : Number(row.plan_id),
    log_id: row.log_id === null ? null : Number(row.log_id),
    remind_type: row.remind_type,
    scheduled_at: row.scheduled_at,
    sent_at: row.sent_at,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const reminderQueueModel = {
  async createTask(payload) {
    const [result] = await query(
      `INSERT INTO reminder_queue (
         user_id, plan_id, log_id, remind_type, scheduled_at, sent_at, status, error_message
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.user_id,
        payload.plan_id || null,
        payload.log_id || null,
        payload.remind_type,
        payload.scheduled_at,
        payload.sent_at || null,
        payload.status || 'pending',
        payload.error_message || null,
      ]
    );

    const [rows] = await query(
      `SELECT id, user_id, plan_id, log_id, remind_type, scheduled_at, sent_at,
              status, error_message, created_at, updated_at
       FROM reminder_queue
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return mapQueueRow(rows[0] || null);
  },

  async getByLogAndType(logId, remindType) {
    const [rows] = await query(
      `SELECT id, user_id, plan_id, log_id, remind_type, scheduled_at, sent_at,
              status, error_message, created_at, updated_at
       FROM reminder_queue
       WHERE log_id = ? AND remind_type = ?
       ORDER BY id DESC
       LIMIT 1`,
      [logId, remindType]
    );

    return mapQueueRow(rows[0] || null);
  },

  async markSent(queueId) {
    const [result] = await query(
      `UPDATE reminder_queue
       SET status = 'sent',
           sent_at = NOW(),
           error_message = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [queueId]
    );

    return Number(result.affectedRows || 0);
  },

  async markFailed(queueId, errorMessage) {
    const [result] = await query(
      `UPDATE reminder_queue
       SET status = 'failed',
           error_message = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [errorMessage || '发送失败', queueId]
    );

    return Number(result.affectedRows || 0);
  },

  async listPending(limit) {
    const [rows] = await query(
      `SELECT id, user_id, plan_id, log_id, remind_type, scheduled_at, sent_at,
              status, error_message, created_at, updated_at
       FROM reminder_queue
       WHERE status = 'pending'
       ORDER BY scheduled_at ASC, id ASC
       LIMIT ?`,
      [limit || 100]
    );

    return rows.map(mapQueueRow);
  },
};

module.exports = reminderQueueModel;
