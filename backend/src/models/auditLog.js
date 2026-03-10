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
}

module.exports = AuditLogModel;
