'use strict';

const { query } = require('../config/database');

class AuditLogModel {
  static async create({ userId = null, action, ipAddress = null, userAgent = null, details = null }) {
    const payload = details === null ? null : JSON.stringify(details);
    const [result] = await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, ipAddress, userAgent, payload]
    );
    return result.insertId;
  }
}

module.exports = AuditLogModel;
