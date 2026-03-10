'use strict';

const { query } = require('../config/database');

function unwrap(result) {
  return Array.isArray(result) ? result[0] : result;
}

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    doctorId: row.doctor_id,
    department: row.department,
    consultStatus: row.consult_status,
    sessionUrl: row.session_url,
    thirdPartySessionId: row.third_party_session_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

const onlineConsultationModel = {
  /**
   * 创建在线问诊记录
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async create(payload) {
    const result = unwrap(
      await query(
        `INSERT INTO online_consultations
         (user_id, doctor_id, department, consult_status, session_url, third_party_session_id, started_at, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(payload.userId),
          Number(payload.doctorId),
          payload.department,
          payload.consultStatus || 'pending',
          payload.sessionUrl || null,
          payload.thirdPartySessionId || null,
          payload.startedAt || null,
          payload.endedAt || null,
        ]
      )
    );

    return this.findById(result.insertId);
  },

  /**
   * 根据 ID 查询问诊记录
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const rows = unwrap(
      await query(
        `SELECT id, user_id, doctor_id, department, consult_status, session_url,
                third_party_session_id, started_at, ended_at, created_at
         FROM online_consultations
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
   * 更新问诊状态
   * @param {number|string} id
   * @param {string} consultStatus
   * @param {object} extra
   * @returns {Promise<boolean>}
   */
  async updateStatus(id, consultStatus, extra = {}) {
    const result = unwrap(
      await query(
        `UPDATE online_consultations
         SET consult_status = ?,
             session_url = COALESCE(?, session_url),
             third_party_session_id = COALESCE(?, third_party_session_id),
             started_at = COALESCE(?, started_at),
             ended_at = COALESCE(?, ended_at)
         WHERE id = ?`,
        [
          consultStatus,
          extra.sessionUrl || null,
          extra.thirdPartySessionId || null,
          extra.startedAt || null,
          extra.endedAt || null,
          Number(id),
        ]
      )
    );

    return result.affectedRows > 0;
  },

  /**
   * 按用户查询问诊记录
   * @param {number|string} userId
   * @param {number} limit
   * @returns {Promise<Array<object>>}
   */
  async listByUserId(userId, limit = 20) {
    const rows = unwrap(
      await query(
        `SELECT id, user_id, doctor_id, department, consult_status, session_url,
                third_party_session_id, started_at, ended_at, created_at
         FROM online_consultations
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [Number(userId), Number(limit)]
      )
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },
};

module.exports = onlineConsultationModel;
