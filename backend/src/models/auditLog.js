'use strict';

const { query } = require('../config/database');
const { sanitizeObject, sanitizeText } = require('../utils/thirdParty');

class AuditLogModel {
  static async create({
    userId = null,
    action,
    ipAddress = null,
    userAgent = null,
    details = null,
  }) {
    const sanitizedDetails = details === null ? null : sanitizeObject(details);
    const payload = sanitizedDetails === null ? null : JSON.stringify(sanitizedDetails);

    const safeIp = ipAddress ? String(ipAddress).slice(0, 45) : null;
    const safeUserAgent = userAgent ? sanitizeText(userAgent).slice(0, 512) : null;

    const [result] = await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, safeIp, safeUserAgent, payload]
    );
    return result.insertId;
  }

  static async list(filters = {}, pagination = {}) {
    const page = Math.max(Number(pagination.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(pagination.pageSize) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const conditions = ['1 = 1'];
    const params = [];

    if (filters.userId) {
      conditions.push('user_id = ?');
      params.push(Number(filters.userId));
    }

    if (filters.action) {
      conditions.push('action = ?');
      params.push(String(filters.action).trim());
    }

    const [rows] = await query(
      `SELECT id, user_id, action, ip_address, user_agent, details, created_at
       FROM audit_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return rows.map((row) => ({
      id: Number(row.id),
      userId: row.user_id === null ? null : Number(row.user_id),
      action: row.action,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      details: this.parseDetails(row.details),
      createdAt: row.created_at,
    }));
  }

  static async count(filters = {}) {
    const conditions = ['1 = 1'];
    const params = [];

    if (filters.userId) {
      conditions.push('user_id = ?');
      params.push(Number(filters.userId));
    }

    if (filters.action) {
      conditions.push('action = ?');
      params.push(String(filters.action).trim());
    }

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM audit_logs
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    return Number(rows[0] ? rows[0].total : 0);
  }

  static parseDetails(value) {
    if (!value) {
      return null;
    }

    if (typeof value === 'object') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch (_err) {
      return null;
    }
  }
}

module.exports = AuditLogModel;
