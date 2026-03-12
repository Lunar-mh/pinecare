'use strict';

const { query } = require('../config/database');

class DrugInteractionModel {
  static async batchInsertInteractions(userId, interactions, checkBatchId) {
    if (!Array.isArray(interactions) || interactions.length === 0) {
      return [];
    }

    const placeholders = interactions.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
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

  static async updateInteractionStatus(interactionId, status) {
    const [result] = await query(
      `UPDATE drug_interactions
       SET status = ?
       WHERE id = ?`,
      [status, interactionId]
    );

    return result.affectedRows > 0;
  }

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

  static async findTopInteractionByPair(drugA, drugB) {
    const [rows] = await query(
      `SELECT level, mechanism, risk_description, suggestion
       FROM drug_interactions
       WHERE (drug_a = ? AND drug_b = ?) OR (drug_a = ? AND drug_b = ?)
       ORDER BY FIELD(level, 'X', 'D', 'C', 'B', 'A'), id DESC
       LIMIT 1`,
      [drugA, drugB, drugB, drugA]
    );

    return rows[0] || null;
  }

  static async getUserChronicDiseases(userId) {
    const [rows] = await query(
      `SELECT chronic_diseases
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    return rows[0] ? rows[0].chronic_diseases : null;
  }
}

module.exports = DrugInteractionModel;
