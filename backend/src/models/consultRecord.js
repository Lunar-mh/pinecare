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

  /**
   * 清空指定会话记录
   * @param {number} userId
   * @param {string} sessionId
   * @returns {Promise<number>}
   */
  static async deleteBySession(userId, sessionId) {
    const [result] = await query(
      `DELETE FROM consult_records
       WHERE user_id = ? AND session_id = ?`,
      [userId, sessionId]
    );
    return Number(result && result.affectedRows ? result.affectedRows : 0);
  }

  /**
   * 清空用户全部咨询记录
   * @param {number} userId
   * @returns {Promise<number>}
   */
  static async deleteByUser(userId) {
    const [result] = await query(
      `DELETE FROM consult_records
       WHERE user_id = ?`,
      [userId]
    );
    return Number(result && result.affectedRows ? result.affectedRows : 0);
  }
}

module.exports = ConsultRecord;
