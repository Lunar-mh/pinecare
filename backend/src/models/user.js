'use strict';

const { query } = require('../config/database');

function normalizeUserRow(row) {
  if (!row) return null;
  let diseases = row.chronic_diseases;
  if (typeof diseases === 'string') {
    try {
      diseases = JSON.parse(diseases);
    } catch (err) {
      diseases = [];
    }
  }
  if (!Array.isArray(diseases)) {
    diseases = diseases ? [String(diseases)] : [];
  }
  return {
    ...row,
    chronic_diseases: diseases,
  };
}

class UserModel {
  static async findById(id) {
    const [rows] = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return normalizeUserRow(rows[0] || null);
  }

  static async findByPhone(phone) {
    const [rows] = await query('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
    return normalizeUserRow(rows[0] || null);
  }

  static async findByOpenid(openid) {
    const [rows] = await query('SELECT * FROM users WHERE openid = ? LIMIT 1', [openid]);
    return normalizeUserRow(rows[0] || null);
  }

  static async createWithPhone({ phone, passwordHash }) {
    const [result] = await query(
      `INSERT INTO users (phone, password_hash, account_status, failed_login_attempts)
       VALUES (?, ?, 'active', 0)`,
      [phone, passwordHash]
    );
    return this.findById(result.insertId);
  }

  static async createWithWechat({ openid, nickname, avatarUrl }) {
    const [result] = await query(
      `INSERT INTO users (openid, nickname, avatar_url, account_status, failed_login_attempts)
       VALUES (?, ?, ?, 'active', 0)`,
      [openid, nickname || null, avatarUrl || null]
    );
    return this.findById(result.insertId);
  }

  static async updateWechatProfile(userId, { nickname, avatarUrl }) {
    const fields = [];
    const values = [];

    if (nickname !== undefined) {
      fields.push('nickname = ?');
      values.push(nickname || null);
    }
    if (avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      values.push(avatarUrl || null);
    }

    if (fields.length === 0) {
      return this.findById(userId);
    }

    values.push(userId);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(userId);
  }

  static async markLoginSuccess(userId) {
    await query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           account_status = CASE WHEN account_status = 'deleted' THEN 'deleted' ELSE 'active' END,
           last_login_at = NOW()
       WHERE id = ?`,
      [userId]
    );
  }

  static async incrementFailedLoginAttempts(userId) {
    await query(
      `UPDATE users
       SET failed_login_attempts = failed_login_attempts + 1
       WHERE id = ?`,
      [userId]
    );
    return this.findById(userId);
  }

  static async setAccountLock(userId, lockedUntil, failedAttempts) {
    await query(
      `UPDATE users
       SET account_status = 'locked',
           failed_login_attempts = ?,
           locked_until = ?
       WHERE id = ?`,
      [failedAttempts, lockedUntil, userId]
    );
    return this.findById(userId);
  }

  static async clearFailedAttempts(userId) {
    await query(
      `UPDATE users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           account_status = CASE WHEN account_status = 'deleted' THEN 'deleted' ELSE 'active' END
       WHERE id = ?`,
      [userId]
    );
  }

  static async unlockByPhone(phone) {
    await query(
      `UPDATE users
       SET account_status = 'active',
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE phone = ? AND account_status <> 'deleted'`,
      [phone]
    );
    return this.findByPhone(phone);
  }

  static async softDelete(userId) {
    const [result] = await query(
      `UPDATE users
       SET account_status = 'deleted',
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = ?`,
      [userId]
    );
    return result.affectedRows;
  }

  static async getProfileById(userId) {
    const [rows] = await query(
      `SELECT id, phone, openid, nickname, avatar_url, real_name, age, gender,
              chronic_diseases, account_status, created_at, updated_at, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );
    return normalizeUserRow(rows[0] || null);
  }

  static async updateProfile(userId, payload) {
    const fieldMap = {
      real_name: payload.real_name,
      age: payload.age,
      gender: payload.gender,
      chronic_diseases: payload.chronic_diseases,
    };

    const fields = [];
    const values = [];

    Object.keys(fieldMap).forEach((key) => {
      if (fieldMap[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'chronic_diseases') {
          values.push(JSON.stringify(Array.isArray(fieldMap[key]) ? fieldMap[key] : []));
        } else {
          values.push(fieldMap[key]);
        }
      }
    });

    if (fields.length === 0) {
      return this.getProfileById(userId);
    }

    values.push(userId);
    await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getProfileById(userId);
  }
}

module.exports = UserModel;
