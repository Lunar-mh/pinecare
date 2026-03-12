'use strict';

const { query, buildWhereSql } = require('../common');

module.exports = {
  async listFallEvents(
    { search = '', status = '', communityId = null },
    { pageSize = 10, offset = 0 } = {}
  ) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push('(u.nickname LIKE ? OR u.phone LIKE ? OR CAST(f.id AS CHAR) LIKE ?)');
      values.push(keyword, keyword, keyword);
    }

    if (status) {
      where.push('f.status = ?');
      values.push(status);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         f.id,
         f.user_id,
         u.nickname,
         u.phone,
         f.status,
         f.sensor_data,
         f.sensitivity,
         f.detected_at,
         f.cancelled_at,
         f.confirmed_at,
         f.created_at
       FROM fall_events f
       LEFT JOIN users u ON u.id = f.user_id
       ${whereSql}
       ORDER BY f.detected_at DESC, f.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async countFallEvents({ search = '', status = '', communityId = null }) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push('(u.nickname LIKE ? OR u.phone LIKE ? OR CAST(f.id AS CHAR) LIKE ?)');
      values.push(keyword, keyword, keyword);
    }

    if (status) {
      where.push('f.status = ?');
      values.push(status);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM fall_events f
       LEFT JOIN users u ON u.id = f.user_id
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },

  async listDrugInteractions(
    { search = '', status = '', communityId = null },
    { pageSize = 100, offset = 0 } = {}
  ) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        '(u.nickname LIKE ? OR u.phone LIKE ? OR d.drug_a LIKE ? OR d.drug_b LIKE ? OR CAST(d.id AS CHAR) LIKE ?)'
      );
      values.push(keyword, keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push('d.status = ?');
      values.push(status);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         d.id,
         d.user_id,
         u.nickname,
         u.phone,
         d.drug_a,
         d.drug_b,
         d.level,
         d.mechanism,
         d.risk_description,
         d.suggestion,
         d.status,
         d.check_batch_id,
         d.created_at
       FROM drug_interactions d
       LEFT JOIN users u ON u.id = d.user_id
       ${whereSql}
       ORDER BY d.created_at DESC, d.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async updateDrugInteractionStatus(interactionId, status) {
    const [result] = await query(
      `UPDATE drug_interactions
       SET status = ?
       WHERE id = ?`,
      [status, Number(interactionId)]
    );

    return Number(result && result.affectedRows ? result.affectedRows : 0);
  },

  async getDrugInteractionById(interactionId, communityId = null) {
    const values = [Number(interactionId)];
    let sql = `SELECT d.id, d.user_id, d.drug_a, d.drug_b, d.level, d.mechanism, d.risk_description,
                      d.suggestion, d.status, d.check_batch_id, d.created_at
               FROM drug_interactions d
               LEFT JOIN users u ON u.id = d.user_id
               WHERE d.id = ?`;

    if (communityId) {
      sql += ' AND u.community_id = ?';
      values.push(Number(communityId));
    }

    sql += ' LIMIT 1';

    const [rows] = await query(sql, values);

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },
};
