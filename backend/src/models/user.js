'use strict';

const { query } = require('../config/database');

const USER_COLUMNS = [
  'id', 'phone', 'openid', 'nickname', 'avatar_url', 'real_name',
  'age', 'gender', 'chronic_diseases', 'account_status', 'password_hash',
  'failed_login_attempts', 'locked_until', 'created_at', 'updated_at', 'last_login_at',
].join(', ');

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
  /**
   * @description 根据用户主键ID查询账号完整信息
   * @param {number} id 用户主键ID
   * @returns {Promise<object|null>} 规整后的用户对象或 null
   */
  static async findById(id) {
    const [rows] = await query(`SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
    return normalizeUserRow(rows[0] || null);
  }

  /**
   * @description 根据手机号查询用户账号
   * @param {string} phone 11位手机号
   * @returns {Promise<object|null>}
   */
  static async findByPhone(phone) {
    const [rows] = await query(`SELECT ${USER_COLUMNS} FROM users WHERE phone = ? LIMIT 1`, [phone]);
    return normalizeUserRow(rows[0] || null);
  }

  /**
   * @description 根据微信 openid 查询绑定的用户账号
   * @param {string} openid 微信用户唯一标识
   * @returns {Promise<object|null>}
   */
  static async findByOpenid(openid) {
    const [rows] = await query(`SELECT ${USER_COLUMNS} FROM users WHERE openid = ? LIMIT 1`, [openid]);
    return normalizeUserRow(rows[0] || null);
  }

  /**
   * @description 使用手机号与密码哈希创建新用户
   * @param {object} payload
   * @param {string} payload.phone 手机号
   * @param {string} payload.passwordHash 加密哈希
   * @returns {Promise<object>} 新建用户对象
   */
  static async createWithPhone({ phone, passwordHash }) {
    const [result] = await query(
      `INSERT INTO users (phone, password_hash, account_status, failed_login_attempts)
       VALUES (?, ?, 'active', 0)`,
      [phone, passwordHash]
    );
    return this.findById(result.insertId);
  }

  /**
   * @description 微信小程序/公众号授权创建新用户
   * @param {object} payload
   * @param {string} payload.openid 微信 openid
   * @param {string} [payload.nickname] 昵称
   * @param {string} [payload.avatarUrl] 头像地址
   * @returns {Promise<object>} 新建用户对象
   */
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

  /**
   * 更新用户密码
   */
  static async updatePassword(userId, passwordHash) {
    await query(
      `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
      [passwordHash, userId]
    );
    return this.findById(userId);
  }
}

module.exports = UserModel;
