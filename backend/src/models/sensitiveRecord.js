'use strict';

const { query } = require('../config/database');

/**
 * SensitiveRecord 模型 — 敏感内容记录表 (sensitive_records)
 */
class SensitiveRecord {
  /**
   * 创建敏感内容记录
   * @param {{ userId, content, riskType, riskLevel }} data
   * @returns {Promise<number>} insertId
   */
  static async create({ userId, content, riskType, riskLevel }) {
    const [result] = await query(
      `INSERT INTO sensitive_records (user_id, content, risk_type, risk_level)
       VALUES (?, ?, ?, ?)`,
      [userId, content, riskType, riskLevel]
    );
    return result.insertId;
  }

  /**
   * 按用户查询敏感记录
   * @param {number} userId
   * @param {Object} opts - { riskLevel, handled, limit }
   * @returns {Promise<Array>}
   */
  static async findByUser(userId, { riskLevel = null, handled = null, limit = 50 } = {}) {
    let sql = `SELECT id, user_id, content, risk_type, risk_level, handled, created_at
               FROM sensitive_records
               WHERE user_id = ?`;
    const params = [userId];

    if (riskLevel !== null) {
      sql += ' AND risk_level = ?';
      params.push(riskLevel);
    }
    if (handled !== null) {
      sql += ' AND handled = ?';
      params.push(handled ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await query(sql, params);
    return rows;
  }

  /**
   * 标记为已处理
   * @param {number} id
   * @returns {Promise<void>}
   */
  static async markHandled(id) {
    await query(
      `UPDATE sensitive_records SET handled = 1 WHERE id = ?`,
      [id]
    );
  }
}

module.exports = SensitiveRecord;
