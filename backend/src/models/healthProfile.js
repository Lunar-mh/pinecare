'use strict';

const { query } = require('../config/database');

/**
 * HealthProfile 模型 — 健康画像表 (health_profiles)
 * JSON 字段自动序列化/反序列化
 */
class HealthProfile {
  /**
   * 按用户ID查询健康画像
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  static async findByUserId(userId) {
    const [rows] = await query(
      `SELECT id, user_id, age, gender,
              chronic_diseases, allergies, recent_indicators, current_medications,
              updated_at
       FROM health_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return HealthProfile._deserialize(row);
  }

  /**
   * 创建或更新健康画像（UPSERT）
   * @param {number} userId
   * @param {Object} data - age, gender, chronicDiseases, allergies, recentIndicators, currentMedications
   * @returns {Promise<void>}
   */
  static async upsert(userId, data) {
    const {
      age = null,
      gender = null,
      chronicDiseases = null,
      allergies = null,
      recentIndicators = null,
      currentMedications = null,
    } = data;

    await query(
      `INSERT INTO health_profiles
         (user_id, age, gender, chronic_diseases, allergies, recent_indicators, current_medications)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         age = VALUES(age),
         gender = VALUES(gender),
         chronic_diseases = VALUES(chronic_diseases),
         allergies = VALUES(allergies),
         recent_indicators = VALUES(recent_indicators),
         current_medications = VALUES(current_medications),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        age,
        gender,
        chronicDiseases !== null ? JSON.stringify(chronicDiseases) : null,
        allergies !== null ? JSON.stringify(allergies) : null,
        recentIndicators !== null ? JSON.stringify(recentIndicators) : null,
        currentMedications !== null ? JSON.stringify(currentMedications) : null,
      ]
    );
  }

  /**
   * 将数据库行的 JSON 字段反序列化
   * @private
   */
  static _deserialize(row) {
    const parseJson = (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'object') return val; // mysql2 自动解析 JSON 列
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    return {
      id: row.id,
      userId: row.user_id,
      age: row.age,
      gender: row.gender,
      chronicDiseases: parseJson(row.chronic_diseases),
      allergies: parseJson(row.allergies),
      recentIndicators: parseJson(row.recent_indicators),
      currentMedications: parseJson(row.current_medications),
      updatedAt: row.updated_at,
    };
  }
}

module.exports = HealthProfile;
