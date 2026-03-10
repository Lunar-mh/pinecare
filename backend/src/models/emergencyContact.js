'use strict';

const { query } = require('../config/database');

class EmergencyContactModel {
  static async listByUserId(userId) {
    const [rows] = await query(
      `SELECT id, user_id, name, phone, relationship, is_primary, created_at, updated_at
       FROM emergency_contacts
       WHERE user_id = ?
       ORDER BY is_primary DESC, id DESC`,
      [userId]
    );
    return rows;
  }

  static async countByUserId(userId) {
    const [rows] = await query('SELECT COUNT(1) AS total FROM emergency_contacts WHERE user_id = ?', [userId]);
    return rows[0] ? rows[0].total : 0;
  }

  static async create(userId, { name, phone, relationship, isPrimary = false }) {
    if (isPrimary) {
      await query('UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?', [userId]);
    }

    const [result] = await query(
      `INSERT INTO emergency_contacts (user_id, name, phone, relationship, is_primary)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, name, phone, relationship, isPrimary ? 1 : 0]
    );

    const [rows] = await query(
      `SELECT id, user_id, name, phone, relationship, is_primary, created_at, updated_at
       FROM emergency_contacts
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );
    return rows[0] || null;
  }

  static async deleteByIdAndUserId(id, userId) {
    const [result] = await query('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?', [id, userId]);
    return result.affectedRows;
  }
}

module.exports = EmergencyContactModel;
