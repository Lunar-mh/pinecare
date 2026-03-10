'use strict';

const { query } = require('../config/database');

function buildWhere(filters = {}) {
  const where = [];
  const values = [];

  if (filters.search) {
    where.push('(u.nickname LIKE ? OR u.phone LIKE ? OR CAST(u.id AS CHAR) LIKE ?)');
    const keyword = `%${filters.search}%`;
    values.push(keyword, keyword, keyword);
  }

  if (filters.accountStatus) {
    where.push('u.account_status = ?');
    values.push(filters.accountStatus);
  }

  if (filters.role === 'family') {
    where.push(
      "EXISTS (SELECT 1 FROM family_bindings fb WHERE fb.family_user_id = u.id AND fb.binding_status IN ('pending', 'approved'))"
    );
  } else if (filters.role === 'elder') {
    where.push(
      "NOT EXISTS (SELECT 1 FROM family_bindings fb WHERE fb.family_user_id = u.id AND fb.binding_status IN ('pending', 'approved'))"
    );
  }

  if (where.length === 0) {
    return { whereSql: '', values };
  }

  return {
    whereSql: `WHERE ${where.join(' AND ')}`,
    values,
  };
}

const ROLE_SQL =
  "CASE WHEN EXISTS (SELECT 1 FROM family_bindings fb WHERE fb.family_user_id = u.id AND fb.binding_status IN ('pending', 'approved')) THEN 'family' ELSE 'elder' END";

const adminUserModel = {
  async listUsers(filters = {}, pagination = {}) {
    const pageSize = Number(pagination.pageSize) || 10;
    const offset = Number(pagination.offset) || 0;
    const { whereSql, values } = buildWhere(filters);

    const [rows] = await query(
      `SELECT
         u.id,
         u.nickname,
         u.phone,
         u.age,
         u.account_status,
         u.created_at,
         u.last_login_at,
         ${ROLE_SQL} AS user_role
       FROM users u
       ${whereSql}
       ORDER BY u.created_at DESC, u.id DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return rows;
  },

  async countUsers(filters = {}) {
    const { whereSql, values } = buildWhere(filters);
    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM users u
       ${whereSql}`,
      values
    );
    return Number(rows[0] ? rows[0].total : 0);
  },

  async findById(userId) {
    const [rows] = await query(
      `SELECT
         u.id,
         u.nickname,
         u.phone,
         u.age,
         u.account_status,
         u.created_at,
         u.last_login_at,
         ${ROLE_SQL} AS user_role
       FROM users u
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );
    return rows[0] || null;
  },

  async createUser(payload) {
    const [result] = await query(
      `INSERT INTO users (nickname, phone, password_hash, account_status, failed_login_attempts)
       VALUES (?, ?, NULL, 'active', 0)`,
      [payload.nickname, payload.phone]
    );
    return Number(result.insertId);
  },

  async updateStatus(userId, accountStatus) {
    const [result] = await query(
      `UPDATE users
       SET account_status = ?
       WHERE id = ?`,
      [accountStatus, userId]
    );
    return Number(result.affectedRows || 0);
  },
};

module.exports = adminUserModel;
