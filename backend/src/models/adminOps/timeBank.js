'use strict';

const { query, buildWhereSql } = require('./common');

module.exports = {
  async listTimeBankServiceHistory(
    { search = '', status = '', communityId = null },
    { pageSize = 10, offset = 0 } = {}
  ) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        `(
          up.nickname LIKE ? OR up.phone LIKE ? OR ur.nickname LIKE ? OR ur.phone LIKE ?
          OR sr.service_type LIKE ? OR CAST(sr.id AS CHAR) LIKE ?
        )`
      );
      values.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push('sr.status = ?');
      values.push(status);
    }

    if (communityId) {
      where.push('(up.community_id = ? OR ur.community_id = ?)');
      values.push(Number(communityId), Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         sr.id,
         sr.provider_id,
         sr.recipient_id,
         sr.service_type,
         sr.start_time,
         sr.end_time,
         sr.duration_hours,
         sr.time_coins,
         sr.status,
         sr.created_at,
         up.nickname AS provider_nickname,
         up.phone AS provider_phone,
         ur.nickname AS recipient_nickname,
         ur.phone AS recipient_phone
       FROM service_records sr
       LEFT JOIN users up ON up.id = sr.provider_id
       LEFT JOIN users ur ON ur.id = sr.recipient_id
       ${whereSql}
       ORDER BY sr.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },


  async countTimeBankServiceHistory({ search = '', status = '', communityId = null }) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        `(
          up.nickname LIKE ? OR up.phone LIKE ? OR ur.nickname LIKE ? OR ur.phone LIKE ?
          OR sr.service_type LIKE ? OR CAST(sr.id AS CHAR) LIKE ?
        )`
      );
      values.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push('sr.status = ?');
      values.push(status);
    }

    if (communityId) {
      where.push('(up.community_id = ? OR ur.community_id = ?)');
      values.push(Number(communityId), Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM service_records sr
       LEFT JOIN users up ON up.id = sr.provider_id
       LEFT JOIN users ur ON ur.id = sr.recipient_id
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },


  async getTimeBankServiceRecordById(recordId, communityId = null) {
    const values = [Number(recordId)];
    let sql = `SELECT sr.id, sr.provider_id, sr.recipient_id, sr.service_type, sr.start_time, sr.end_time,
                      sr.duration_hours, sr.time_coins, sr.status, sr.created_at
               FROM service_records sr
               LEFT JOIN users up ON up.id = sr.provider_id
               LEFT JOIN users ur ON ur.id = sr.recipient_id
               WHERE sr.id = ?`;

    if (communityId) {
      sql += ' AND (up.community_id = ? OR ur.community_id = ?)';
      values.push(Number(communityId), Number(communityId));
    }

    sql += ' LIMIT 1';

    const [rows] = await query(sql, values);

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },


  async listTimeBankExchangeHistory({ limit = 200, communityId = null } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
    const values = [];
    let sql = `SELECT
         er.id,
         er.user_id,
         er.exchange_type,
         er.item_name,
         er.coins_required,
         er.status,
         er.created_at,
         er.completed_at
       FROM exchange_records er`;

    if (communityId) {
      sql += ' LEFT JOIN users u ON u.id = er.user_id WHERE u.community_id = ?';
      values.push(Number(communityId));
    }

    sql += ' ORDER BY er.id DESC LIMIT ?';
    values.push(safeLimit);

    const [rows] = await query(sql, values);

    return Array.isArray(rows) ? rows : [];
  },


  async listTimeBankLeaderboard({ communityId = null, limit = 100 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const cid =
      communityId === undefined || communityId === null || communityId === ''
        ? null
        : Number(communityId);

    if (cid) {
      const [rows] = await query(
        `SELECT ta.user_id, ta.balance, ta.total_earned, ta.credit_score, ta.credit_level
         FROM time_accounts ta
         INNER JOIN users u ON u.id = ta.user_id
         WHERE u.community_id = ?
         ORDER BY ta.balance DESC, ta.total_earned DESC, ta.id ASC
         LIMIT ?`,
        [cid, safeLimit]
      );

      return Array.isArray(rows) ? rows : [];
    }

    const [rows] = await query(
      `SELECT user_id, balance, total_earned, credit_score, credit_level
       FROM time_accounts
       ORDER BY balance DESC, total_earned DESC, id ASC
       LIMIT ?`,
      [safeLimit]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async settleServiceRecord(recordId, action) {
    const status = action === 'confirm' ? 'confirmed' : 'cancelled';
    const [result] = await query(
      'UPDATE service_records SET status = ? WHERE id = ?',
      [status, Number(recordId)]
    );
    return result;
  },
};
