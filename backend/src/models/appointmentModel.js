'use strict';

const { query } = require('../config/database');

function unwrap(result) {
  return Array.isArray(result) ? result[0] : result;
}

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    hospitalId: row.hospital_id,
    department: row.department,
    doctorId: row.doctor_id,
    appointmentDate: row.appointment_date,
    timeSlot: row.time_slot,
    appointStatus: row.appoint_status,
    thirdPartyAppointId: row.third_party_appoint_id,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  };
}

const appointmentModel = {
  async create(payload) {
    const result = unwrap(
      await query(
        `INSERT INTO appointments
         (user_id, hospital_id, department, doctor_id, appointment_date, time_slot, appoint_status,
          third_party_appoint_id, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(payload.userId),
          Number(payload.hospitalId),
          payload.department,
          Number(payload.doctorId),
          payload.appointmentDate,
          payload.timeSlot,
          payload.appointStatus || 'pending',
          payload.thirdPartyAppointId || null,
          payload.idempotencyKey,
        ]
      )
    );

    return this.findById(result.insertId);
  },

  async findById(id) {
    const rows = unwrap(
      await query(
        `SELECT id, user_id, hospital_id, department, doctor_id, appointment_date,
                time_slot, appoint_status, third_party_appoint_id, idempotency_key, created_at
         FROM appointments
         WHERE id = ?
         LIMIT 1`,
        [Number(id)]
      )
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  },

  async findByIdAndUserId(id, userId) {
    const rows = unwrap(
      await query(
        `SELECT id, user_id, hospital_id, department, doctor_id, appointment_date,
                time_slot, appoint_status, third_party_appoint_id, idempotency_key, created_at
         FROM appointments
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [Number(id), Number(userId)]
      )
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  },

  async findByIdempotencyKey(idempotencyKey) {
    const rows = unwrap(
      await query(
        `SELECT id, user_id, hospital_id, department, doctor_id, appointment_date,
                time_slot, appoint_status, third_party_appoint_id, idempotency_key, created_at
         FROM appointments
         WHERE idempotency_key = ?
         LIMIT 1`,
        [String(idempotencyKey)]
      )
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  },

  async updateStatus(id, appointStatus) {
    const result = unwrap(
      await query(
        `UPDATE appointments
         SET appoint_status = ?
         WHERE id = ?`,
        [appointStatus, Number(id)]
      )
    );

    return result.affectedRows > 0;
  },

  async listByUserId(userId, options = {}) {
    const status = options.status ? String(options.status).trim() : '';
    const page = Number.isInteger(Number(options.page)) ? Math.max(1, Number(options.page)) : 1;
    const pageSize = Number.isInteger(Number(options.pageSize))
      ? Math.min(Math.max(1, Number(options.pageSize)), 100)
      : 20;

    const where = ['user_id = ?'];
    const countParams = [Number(userId)];

    if (status) {
      where.push('appoint_status = ?');
      countParams.push(status);
    }

    const [countRows] = await query(
      `SELECT COUNT(1) AS total
       FROM appointments
       WHERE ${where.join(' AND ')}`,
      countParams
    );

    const total = Number(countRows[0] ? countRows[0].total : 0);
    const offset = (page - 1) * pageSize;

    const rows = unwrap(
      await query(
        `SELECT id, user_id, hospital_id, department, doctor_id, appointment_date,
                time_slot, appoint_status, third_party_appoint_id, idempotency_key, created_at
         FROM appointments
         WHERE ${where.join(' AND ')}
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
        [...countParams, pageSize, offset]
      )
    );

    return {
      list: Array.isArray(rows) ? rows.map(mapRow) : [],
      page,
      pageSize,
      total,
    };
  },
};

module.exports = appointmentModel;
