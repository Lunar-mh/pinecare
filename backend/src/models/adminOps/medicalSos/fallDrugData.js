'use strict';

const { query, buildWhereSql } = require('../common');

function buildFallWhere({ search = '', status = '', communityId = null }) {
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

  return {
    whereSql: buildWhereSql(where),
    values,
  };
}

module.exports = {
  async listFallEvents(filters = {}, { pageSize = 10, offset = 0 } = {}) {
    const { whereSql, values } = buildFallWhere(filters);
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

  async countFallEvents(filters = {}) {
    const { whereSql, values } = buildFallWhere(filters);
    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM fall_events f
       LEFT JOIN users u ON u.id = f.user_id
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },
};
