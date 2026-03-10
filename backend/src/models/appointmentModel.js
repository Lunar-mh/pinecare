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
  /**
   * 创建预约记录
   * @param {object} payload
   * @returns {Promise<object>}
   */
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

  /**
   * 根据 ID 查询预约
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
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

  /**
   * 根据幂等键查询预约
   * @param {string} idempotencyKey
   * @returns {Promise<object|null>}
   */
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

  /**
   * 更新预约状态
   * @param {number|string} id
   * @param {'pending'|'confirmed'|'cancelled'} appointStatus
   * @returns {Promise<boolean>}
   */
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

  /**
   * 按用户查询预约
   * @param {number|string} userId
   * @param {number} limit
   * @returns {Promise<Array<object>>}
   */
  async listByUserId(userId, limit = 20) {
    const rows = unwrap(
      await query(
        `SELECT id, user_id, hospital_id, department, doctor_id, appointment_date,
                time_slot, appoint_status, third_party_appoint_id, idempotency_key, created_at
         FROM appointments
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [Number(userId), Number(limit)]
      )
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },
};

module.exports = appointmentModel;
