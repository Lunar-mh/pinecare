'use strict';

const { query } = require('../config/database');

function parseRemindTimes(remindTimes) {
  if (Array.isArray(remindTimes)) {
    return remindTimes;
  }
  if (typeof remindTimes === 'string') {
    try {
      const parsed = JSON.parse(remindTimes);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
}

function mapPlanRow(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    medication_name: row.medication_name,
    dosage: row.dosage,
    frequency: row.frequency,
    remind_times: parseRemindTimes(row.remind_times),
    start_date: row.start_date,
    end_date: row.end_date,
    remaining_quantity: row.remaining_quantity === null ? null : Number(row.remaining_quantity),
    reminder_threshold: Number(row.reminder_threshold),
    is_active: Number(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const medicationPlanModel = {
  async listByUserId(userId) {
    const [rows] = await query(
      `SELECT id, user_id, medication_name, dosage, frequency, remind_times, start_date, end_date,
              remaining_quantity, reminder_threshold, is_active, created_at, updated_at
       FROM medication_plans
       WHERE user_id = ?
       ORDER BY is_active DESC, created_at DESC, id DESC`,
      [userId]
    );

    return rows.map(mapPlanRow);
  },

  async getById(planId) {
    const [rows] = await query(
      `SELECT id, user_id, medication_name, dosage, frequency, remind_times, start_date, end_date,
              remaining_quantity, reminder_threshold, is_active, created_at, updated_at
       FROM medication_plans
       WHERE id = ?
       LIMIT 1`,
      [planId]
    );

    return mapPlanRow(rows[0] || null);
  },

  async getByIdAndUser(planId, userId) {
    const [rows] = await query(
      `SELECT id, user_id, medication_name, dosage, frequency, remind_times, start_date, end_date,
              remaining_quantity, reminder_threshold, is_active, created_at, updated_at
       FROM medication_plans
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [planId, userId]
    );

    return mapPlanRow(rows[0] || null);
  },

  async create(payload) {
    const remindTimes = JSON.stringify(payload.remind_times || []);

    const [result] = await query(
      `INSERT INTO medication_plans (
         user_id, medication_name, dosage, frequency, remind_times,
         start_date, end_date, remaining_quantity, reminder_threshold, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.user_id,
        payload.medication_name,
        payload.dosage,
        payload.frequency,
        remindTimes,
        payload.start_date,
        payload.end_date || null,
        payload.remaining_quantity === undefined ? null : payload.remaining_quantity,
        payload.reminder_threshold === undefined ? 3 : payload.reminder_threshold,
        payload.is_active === undefined ? 1 : payload.is_active,
      ]
    );

    return this.getById(result.insertId);
  },

  async updateByIdAndUser(planId, userId, payload) {
    const fieldMap = {
      medication_name: payload.medication_name,
      dosage: payload.dosage,
      frequency: payload.frequency,
      remind_times:
        payload.remind_times === undefined ? undefined : JSON.stringify(payload.remind_times || []),
      start_date: payload.start_date,
      end_date: payload.end_date,
      remaining_quantity: payload.remaining_quantity,
      reminder_threshold: payload.reminder_threshold,
      is_active: payload.is_active,
    };

    const fields = [];
    const values = [];

    Object.keys(fieldMap).forEach((key) => {
      if (fieldMap[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(fieldMap[key]);
      }
    });

    if (fields.length === 0) {
      return this.getByIdAndUser(planId, userId);
    }

    values.push(planId, userId);

    await query(
      `UPDATE medication_plans
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      values
    );

    return this.getByIdAndUser(planId, userId);
  },

  async deleteByIdAndUser(planId, userId) {
    const [result] = await query(
      `DELETE FROM medication_plans
       WHERE id = ? AND user_id = ?`,
      [planId, userId]
    );

    return Number(result.affectedRows || 0);
  },

  async listDuePlans(currentDate, currentTime) {
    const [rows] = await query(
      `SELECT id, user_id, medication_name, dosage, frequency, remind_times, start_date, end_date,
              remaining_quantity, reminder_threshold, is_active, created_at, updated_at
       FROM medication_plans
       WHERE is_active = 1
         AND start_date <= ?
         AND (end_date IS NULL OR end_date >= ?)
         AND JSON_CONTAINS(remind_times, JSON_QUOTE(?), '$')`,
      [currentDate, currentDate, currentTime]
    );

    return rows.map(mapPlanRow);
  },

  async listRefillCandidates() {
    const [rows] = await query(
      `SELECT id, user_id, medication_name, dosage, frequency, remind_times, start_date, end_date,
              remaining_quantity, reminder_threshold, is_active, created_at, updated_at
       FROM medication_plans
       WHERE is_active = 1
         AND remaining_quantity IS NOT NULL
         AND reminder_threshold IS NOT NULL
         AND remaining_quantity <= reminder_threshold`,
      []
    );

    return rows.map(mapPlanRow);
  },

  async decreaseRemainingQuantity(planId, userId) {
    const [result] = await query(
      `UPDATE medication_plans
       SET remaining_quantity = CASE
         WHEN remaining_quantity IS NULL THEN NULL
         WHEN remaining_quantity <= 0 THEN 0
         ELSE remaining_quantity - 1
       END,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [planId, userId]
    );

    return Number(result.affectedRows || 0);
  },
};

module.exports = medicationPlanModel;
