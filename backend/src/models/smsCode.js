'use strict';

const { query } = require('../config/database');

class SmsCodeModel {
  static async create({ phone, code, purpose, expiresAt }) {
    const [result] = await query(
      `INSERT INTO sms_codes (phone, code, purpose, used, expires_at)
       VALUES (?, ?, ?, 0, ?)`,
      [phone, code, purpose, expiresAt]
    );
    return result.insertId;
  }

  static async findLatestByPhoneAndPurpose(phone, purpose) {
    const [rows] = await query(
      `SELECT id, phone, code, purpose, used, expires_at, created_at
       FROM sms_codes
       WHERE phone = ? AND purpose = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, purpose]
    );
    return rows[0] || null;
  }

  static async markUsed(id) {
    const [result] = await query('UPDATE sms_codes SET used = 1 WHERE id = ? AND used = 0', [id]);
    return result.affectedRows > 0;
  }

  static async verifyAndConsume(phone, code, purpose) {
    const [rows] = await query(
      `SELECT id, phone, code, purpose, used, expires_at
       FROM sms_codes
       WHERE phone = ? AND purpose = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, purpose]
    );

    const record = rows[0];
    if (!record) {
      return { valid: false, message: 'SMS code not found.' };
    }

    if (record.used) {
      return { valid: false, message: 'SMS code has already been used.' };
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      return { valid: false, message: 'SMS code has expired.' };
    }

    if (record.code !== code) {
      return { valid: false, message: 'Invalid SMS code.' };
    }

    const ok = await this.markUsed(record.id);
    if (!ok) {
      return { valid: false, message: 'SMS code has already been used.' };
    }

    return { valid: true, record };
  }
}

module.exports = SmsCodeModel;