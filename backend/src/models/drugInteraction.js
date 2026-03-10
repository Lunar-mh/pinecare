'use strict';

const { query } = require('../config/database');

class DrugInteractionModel {
  /**
   * 批量写入药物相互作用记录
   * @param {number} userId
   * @param {Array<object>} interactions
   * @param {string} checkBatchId
   * @returns {Promise<Array<object>>}
   */
  static async batchInsertInteractions(userId, interactions, checkBatchId) {
    if (!Array.isArray(interactions) || interactions.length === 0) {
      return [];
    }

    const placeholders = interactions
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ');

    const params = [];
    interactions.forEach((item) => {
      params.push(
        userId,
        item.drugA,
        item.drugB,
        item.level,
        item.mechanism || null,
        item.riskDescription || null,
        item.suggestion || null,
        item.status || 'pending',
        checkBatchId
      );
    });

    await query(
      `INSERT INTO drug_interactions
         (user_id, drug_a, drug_b, level, mechanism, risk_description, suggestion, status, check_batch_id)
       VALUES ${placeholders}`,
      params
    );

    return this.listInteractionsByBatch(userId, checkBatchId);
  }

  /**
   * 按批次查询检测记录
   * @param {number} userId
   * @param {string} checkBatchId
   * @returns {Promise<Array<object>>}
   */
  static async listInteractionsByBatch(userId, checkBatchId) {
    const [rows] = await query(
      `SELECT id, user_id, drug_a, drug_b, level, mechanism, risk_description, suggestion,
              status, check_batch_id, created_at
       FROM drug_interactions
       WHERE user_id = ? AND check_batch_id = ?
       ORDER BY FIELD(level, 'X', 'D', 'C', 'B', 'A'), id ASC`,
      [userId, checkBatchId]
    );

    return rows;
  }

  /**
   * 按用户查询历史检测记录
   * @param {number} userId
   * @param {string|null} status
   * @returns {Promise<Array<object>>}
   */
  static async listHistoryByUser(userId, status = null) {
    const hasStatus = typeof status === 'string' && status.trim() !== '';

    const sql = hasStatus
      ? `SELECT id, user_id, drug_a, drug_b, level, mechanism, risk_description, suggestion,
                status, check_batch_id, created_at
         FROM drug_interactions
         WHERE user_id = ? AND status = ?
         ORDER BY created_at DESC, id DESC`
      : `SELECT id, user_id, drug_a, drug_b, level, mechanism, risk_description, suggestion,
                status, check_batch_id, created_at
         FROM drug_interactions
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC`;

    const params = hasStatus ? [userId, status] : [userId];
    const [rows] = await query(sql, params);

    return rows;
  }

  /**
   * 查询单条相互作用记录
   * @param {number} interactionId
   * @returns {Promise<object|null>}
   */
  static async findInteractionById(interactionId) {
    const [rows] = await query(
      `SELECT id, user_id, drug_a, drug_b, level, mechanism, risk_description, suggestion,
              status, check_batch_id, created_at
       FROM drug_interactions
       WHERE id = ?
       LIMIT 1`,
      [interactionId]
    );

    return rows[0] || null;
  }

  /**
   * 更新风险确认状态
   * @param {number} interactionId
   * @param {'acknowledged'} status
   * @returns {Promise<boolean>}
   */
  static async updateInteractionStatus(interactionId, status) {
    const [result] = await query(
      `UPDATE drug_interactions
       SET status = ?
       WHERE id = ?`,
      [status, interactionId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 批量写入药物禁忌记录
   * @param {number} userId
   * @param {string} drugName
   * @param {Array<object>} contraindications
   * @returns {Promise<Array<object>>}
   */
  static async batchInsertContraindications(userId, drugName, contraindications) {
    if (!Array.isArray(contraindications) || contraindications.length === 0) {
      return [];
    }

    const placeholders = contraindications.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const params = [];

    contraindications.forEach((item) => {
      params.push(
        userId,
        drugName,
        item.diseaseCode,
        item.diseaseName,
        item.severity,
        item.description || null
      );
    });

    await query(
      `INSERT INTO drug_contraindications
         (user_id, drug_name, disease_code, disease_name, severity, description)
       VALUES ${placeholders}`,
      params
    );

    return this.listContraindicationsByUserDrug(userId, drugName);
  }

  /**
   * 按用户和药物查询禁忌记录
   * @param {number} userId
   * @param {string} drugName
   * @returns {Promise<Array<object>>}
   */
  static async listContraindicationsByUserDrug(userId, drugName) {
    const [rows] = await query(
      `SELECT id, user_id, drug_name, disease_code, disease_name, severity, description, created_at
       FROM drug_contraindications
       WHERE user_id = ? AND drug_name = ?
       ORDER BY created_at DESC, id DESC`,
      [userId, drugName]
    );

    return rows;
  }

  /**
   * 查询药物食物相互作用
   * @param {string} drugName
   * @param {string|null} keyword
   * @returns {Promise<Array<object>>}
   */
  static async listFoodInteractions(drugName, keyword = null) {
    const baseSql =
      'SELECT id, drug_name, food_name, interaction_type, description, suggestion FROM drug_food_interactions WHERE drug_name = ?';

    if (keyword && String(keyword).trim()) {
      const key = `%${String(keyword).trim()}%`;
      const [rows] = await query(
        `${baseSql} AND (food_name LIKE ? OR interaction_type LIKE ? OR description LIKE ?) ORDER BY id DESC`,
        [drugName, key, key, key]
      );
      return rows;
    }

    const [rows] = await query(`${baseSql} ORDER BY id DESC`, [drugName]);
    return rows;
  }
}

module.exports = DrugInteractionModel;
