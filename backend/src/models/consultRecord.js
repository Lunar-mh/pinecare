'use strict';

const { query } = require('../config/database');

/**
 * ConsultRecord 模型 — 咨询记录表 (consult_records)
 */
class ConsultRecord {
  /**
   * 创建一条记录
   * @param {{ userId, sessionId, role, content, tokens }} data
   * @returns {Promise<number>} insertId
   */
  static async create({ userId, sessionId, role, content, tokens = null }) {
    const [result] = await query(
      `INSERT INTO consult_records (user_id, session_id, role, content, tokens)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, sessionId, role, content, tokens]
    );
    return result.insertId;
  }

  /**
   * 按会话ID查询历史（按时间正序）
   * @param {number} userId
   * @param {string} sessionId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async findBySession(userId, sessionId, limit = 20) {
    const [rows] = await query(
      `SELECT id, user_id, session_id, role, content, tokens, created_at
       FROM consult_records
       WHERE user_id = ? AND session_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [userId, sessionId, limit]
    );
    return rows;
  }

  /**
   * 按用户查询最近历史（按时间倒序）
   * @param {number} userId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  static async findByUser(userId, limit = 50) {
    const [rows] = await query(
      `SELECT id, user_id, session_id, role, content, tokens, created_at
       FROM consult_records
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }
}

module.exports = ConsultRecord;
