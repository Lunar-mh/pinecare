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
    const [rows] = await query('SELECT COUNT(1) AS total FROM emergency_contacts WHERE user_id = ?', [
      userId,
    ]);
    return rows[0] ? rows[0].total : 0;
  }

  static async findByIdAndUserId(id, userId) {
    const [rows] = await query(
      `SELECT id, user_id, name, phone, relationship, is_primary, created_at, updated_at
       FROM emergency_contacts
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId]
    );

    return rows[0] || null;
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

    return this.findByIdAndUserId(result.insertId, userId);
  }

  static async updateByIdAndUserId(id, userId, patch = {}) {
    const fields = [];
    const params = [];

    if (patch.name !== undefined) {
      fields.push('name = ?');
      params.push(patch.name);
    }

    if (patch.phone !== undefined) {
      fields.push('phone = ?');
      params.push(patch.phone);
    }

    if (patch.relationship !== undefined) {
      fields.push('relationship = ?');
      params.push(patch.relationship);
    }

    if (fields.length === 0) {
      return this.findByIdAndUserId(id, userId);
    }

    params.push(id, userId);
    const [result] = await query(
      `UPDATE emergency_contacts
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      params
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.findByIdAndUserId(id, userId);
  }

  static async setPrimaryByIdAndUserId(id, userId) {
    const target = await this.findByIdAndUserId(id, userId);
    if (!target) {
      return null;
    }

    await query('UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?', [userId]);
    await query(
      `UPDATE emergency_contacts
       SET is_primary = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    return this.findByIdAndUserId(id, userId);
  }

  static async deleteByIdAndUserId(id, userId) {
    const [result] = await query('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?', [
      id,
      userId,
    ]);
    return result.affectedRows;
  }
}

module.exports = EmergencyContactModel;
