'use strict';

const { query } = require('../config/database');

function mapLogRow(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    plan_id: Number(row.plan_id),
    medication_name: row.medication_name,
    dosage: row.dosage,
    scheduled_time: row.scheduled_time,
    actual_time: row.actual_time,
    status: row.status,
    reminder_sent: Number(row.reminder_sent || 0),
    second_reminder_sent: Number(row.second_reminder_sent || 0),
    family_notified: Number(row.family_notified || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const medicationLogModel = {
  async createPendingLog(payload) {
    const [existsRows] = await query(
      `SELECT id, user_id, plan_id, scheduled_time, actual_time, status,
              reminder_sent, second_reminder_sent, family_notified, created_at, updated_at
       FROM medication_logs
       WHERE user_id = ? AND plan_id = ? AND scheduled_time = ?
       LIMIT 1`,
      [payload.user_id, payload.plan_id, payload.scheduled_time]
    );

    if (existsRows.length > 0) {
      return mapLogRow(existsRows[0]);
    }

    const [result] = await query(
      `INSERT INTO medication_logs (
         user_id, plan_id, scheduled_time, actual_time, status,
         reminder_sent, second_reminder_sent, family_notified
       ) VALUES (?, ?, ?, NULL, 'pending', 0, 0, 0)`,
      [payload.user_id, payload.plan_id, payload.scheduled_time]
    );

    const [rows] = await query(
      `SELECT id, user_id, plan_id, scheduled_time, actual_time, status,
              reminder_sent, second_reminder_sent, family_notified, created_at, updated_at
       FROM medication_logs
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return mapLogRow(rows[0] || null);
  },

  async getByIdAndUser(logId, userId) {
    const [rows] = await query(
      `SELECT id, user_id, plan_id, scheduled_time, actual_time, status,
              reminder_sent, second_reminder_sent, family_notified, created_at, updated_at
       FROM medication_logs
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [logId, userId]
    );

    return mapLogRow(rows[0] || null);
  },

  async getById(logId) {
    const [rows] = await query(
      `SELECT id, user_id, plan_id, scheduled_time, actual_time, status,
              reminder_sent, second_reminder_sent, family_notified, created_at, updated_at
       FROM medication_logs
       WHERE id = ?
       LIMIT 1`,
      [logId]
    );

    return mapLogRow(rows[0] || null);
  },

  async updateStatusPendingOnly(logId, userId, status) {
    const [result] = await query(
      `UPDATE medication_logs
       SET status = ?,
           actual_time = NOW(),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND user_id = ?
         AND status = 'pending'`,
      [status, logId, userId]
    );

    return Number(result.affectedRows || 0);
  },

  async listByUserAndDateRange(userId, startDate, endDate) {
    const params = [userId];
    const filters = ['l.user_id = ?'];

    if (startDate) {
      filters.push('DATE(l.scheduled_time) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      filters.push('DATE(l.scheduled_time) <= ?');
      params.push(endDate);
    }

    const [rows] = await query(
      `SELECT l.id, l.user_id, l.plan_id, p.medication_name, p.dosage,
              l.scheduled_time, l.actual_time, l.status,
              l.reminder_sent, l.second_reminder_sent, l.family_notified,
              l.created_at, l.updated_at
       FROM medication_logs l
       LEFT JOIN medication_plans p ON p.id = l.plan_id
       WHERE ${filters.join(' AND ')}
       ORDER BY l.scheduled_time DESC, l.id DESC`,
      params
    );

    return rows.map(mapLogRow);
  },

  async markFirstReminderSent(logId) {
    const [result] = await query(
      `UPDATE medication_logs
       SET reminder_sent = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [logId]
    );

    return Number(result.affectedRows || 0);
  },

  async markSecondReminderSent(logId) {
    const [result] = await query(
      `UPDATE medication_logs
       SET second_reminder_sent = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [logId]
    );

    return Number(result.affectedRows || 0);
  },

  async listPendingForSecondReminder(now, minutes) {
    const [rows] = await query(
      `SELECT l.id, l.user_id, l.plan_id, p.medication_name, p.dosage,
              l.scheduled_time, l.actual_time, l.status,
              l.reminder_sent, l.second_reminder_sent, l.family_notified,
              l.created_at, l.updated_at
       FROM medication_logs l
       LEFT JOIN medication_plans p ON p.id = l.plan_id
       WHERE l.status = 'pending'
         AND l.reminder_sent = 1
         AND l.second_reminder_sent = 0
         AND l.scheduled_time <= DATE_SUB(?, INTERVAL ? MINUTE)
       ORDER BY l.scheduled_time ASC, l.id ASC`,
      [now, minutes]
    );

    return rows.map(mapLogRow);
  },

  async listPendingForMissed(now, hours) {
    const [rows] = await query(
      `SELECT l.id, l.user_id, l.plan_id, p.medication_name, p.dosage,
              l.scheduled_time, l.actual_time, l.status,
              l.reminder_sent, l.second_reminder_sent, l.family_notified,
              l.created_at, l.updated_at
       FROM medication_logs l
       LEFT JOIN medication_plans p ON p.id = l.plan_id
       WHERE l.status = 'pending'
         AND l.scheduled_time <= DATE_SUB(?, INTERVAL ? HOUR)
       ORDER BY l.scheduled_time ASC, l.id ASC`,
      [now, hours]
    );

    return rows.map(mapLogRow);
  },

  async markMissed(logId) {
    const [result] = await query(
      `UPDATE medication_logs
       SET status = 'missed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND status = 'pending'`,
      [logId]
    );

    return Number(result.affectedRows || 0);
  },

  async markFamilyNotified(logId) {
    const [result] = await query(
      `UPDATE medication_logs
       SET family_notified = 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [logId]
    );

    return Number(result.affectedRows || 0);
  },

  async aggregateCalendarByMonth(userId, monthStart, monthEndExclusive) {
    const [rows] = await query(
      `SELECT DATE(scheduled_time) AS day,
              SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) AS taken_count,
              SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) AS missed_count,
              SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped_count,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
              COUNT(1) AS total_count
       FROM medication_logs
       WHERE user_id = ?
         AND scheduled_time >= ?
         AND scheduled_time < ?
       GROUP BY DATE(scheduled_time)
       ORDER BY day ASC`,
      [userId, monthStart, monthEndExclusive]
    );

    return rows.map((row) => ({
      day: row.day,
      taken_count: Number(row.taken_count || 0),
      missed_count: Number(row.missed_count || 0),
      skipped_count: Number(row.skipped_count || 0),
      pending_count: Number(row.pending_count || 0),
      total_count: Number(row.total_count || 0),
    }));
  },
};

module.exports = medicationLogModel;
