'use strict';

const { query, buildWhereSql, resolveFamilyBindingColumns } = require('../common');

module.exports = {
  async listGpsCurrent({ search = '', communityId = null }, { pageSize = 10, offset = 0 } = {}) {
    const text = String(search || '').trim();
    const where = [];
    const values = [];

    if (text) {
      const keyword = `%${text}%`;
      where.push('(u.nickname LIKE ? OR u.phone LIKE ? OR CAST(u.id AS CHAR) LIKE ?)');
      values.push(keyword, keyword, keyword);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         lr.id,
         lr.user_id,
         u.nickname,
         u.phone,
         u.age,
         lr.latitude,
         lr.longitude,
         lr.accuracy,
         lr.location_type,
         lr.created_at
       FROM location_records lr
       INNER JOIN (
         SELECT user_id, MAX(id) AS max_id
         FROM location_records
         GROUP BY user_id
       ) latest ON latest.max_id = lr.id
       LEFT JOIN users u ON u.id = lr.user_id
       ${whereSql}
       ORDER BY lr.created_at DESC, lr.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async countGpsCurrent({ search = '', communityId = null }) {
    const text = String(search || '').trim();
    const where = [];
    const values = [];

    if (text) {
      const keyword = `%${text}%`;
      where.push('(u.nickname LIKE ? OR u.phone LIKE ? OR CAST(u.id AS CHAR) LIKE ?)');
      values.push(keyword, keyword, keyword);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM (
         SELECT lr.user_id
         FROM location_records lr
         INNER JOIN (
           SELECT user_id, MAX(id) AS max_id
           FROM location_records
           GROUP BY user_id
         ) latest ON latest.max_id = lr.id
         LEFT JOIN users u ON u.id = lr.user_id
         ${whereSql}
       ) t`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },

  async listGpsTrail(userId, { startDate, endDate, limit = 1000, communityId = null } = {}) {
    const values = [Number(userId), startDate, endDate];
    let sql = `SELECT lr.id, lr.user_id, lr.latitude, lr.longitude, lr.accuracy, lr.location_type, lr.created_at
       FROM location_records lr
       LEFT JOIN users u ON u.id = lr.user_id
       WHERE lr.user_id = ?
         AND lr.created_at >= ?
         AND lr.created_at <= ?`;

    if (communityId) {
      sql += ' AND u.community_id = ?';
      values.push(Number(communityId));
    }

    sql += ' ORDER BY lr.created_at ASC, lr.id ASC LIMIT ?';
    values.push(Number(limit));

    const [rows] = await query(sql, values);

    return Array.isArray(rows) ? rows : [];
  },

  async listFamilyBindings(
    { search = '', status = '', communityId = null },
    { pageSize = 10, offset = 0 } = {}
  ) {
    const { elderColumn, familyColumn, statusColumn } = await resolveFamilyBindingColumns();

    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        `(
          elder.nickname LIKE ? OR elder.real_name LIKE ? OR family.nickname LIKE ? OR family.real_name LIKE ?
          OR elder.phone LIKE ? OR family.phone LIKE ? OR CAST(fb.id AS CHAR) LIKE ?
        )`
      );
      values.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push(`fb.${statusColumn} = ?`);
      values.push(status);
    }

    if (communityId) {
      where.push('elder.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         fb.id,
         fb.${elderColumn} AS elder_id,
         fb.${familyColumn} AS family_id,
         fb.${statusColumn} AS status,
         fb.created_at AS binding_created_at,
         elder.nickname AS elder_nickname,
         elder.real_name AS elder_name,
         elder.avatar_url AS elder_avatar,
         elder.gender AS elder_gender,
         elder.age AS elder_age,
         ha.id AS health_archive_id,
         ha.updated_at AS health_updated_at
       FROM family_bindings fb
       LEFT JOIN users elder ON elder.id = fb.${elderColumn}
       LEFT JOIN users family ON family.id = fb.${familyColumn}
       LEFT JOIN health_archives ha ON ha.user_id = fb.${elderColumn}
       ${whereSql}
       ORDER BY fb.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async countFamilyBindings({ search = '', status = '', communityId = null }) {
    const { elderColumn, familyColumn, statusColumn } = await resolveFamilyBindingColumns();

    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        `(
          elder.nickname LIKE ? OR elder.real_name LIKE ? OR family.nickname LIKE ? OR family.real_name LIKE ?
          OR elder.phone LIKE ? OR family.phone LIKE ? OR CAST(fb.id AS CHAR) LIKE ?
        )`
      );
      values.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push(`fb.${statusColumn} = ?`);
      values.push(status);
    }

    if (communityId) {
      where.push('elder.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM family_bindings fb
       LEFT JOIN users elder ON elder.id = fb.${elderColumn}
       LEFT JOIN users family ON family.id = fb.${familyColumn}
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },
};
