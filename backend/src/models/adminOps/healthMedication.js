'use strict';

const { query, buildWhereSql, resolveFamilyBindingColumns } = require('./common');

module.exports = {
  async listHealthOverview(
    { search = '', communityId = null },
    { pageSize = 10, offset = 0 } = {}
  ) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
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
         u.id AS user_id,
         u.nickname,
         u.phone,
         u.age,
         bp.value_high AS bp_systolic,
         bp.value_low AS bp_diastolic,
         bp.measured_at AS bp_measured_at,
         hr.value AS heart_rate,
         hr.measured_at AS hr_measured_at,
         bs.value AS blood_sugar,
         bs.measured_at AS bs_measured_at,
         GREATEST(
           COALESCE(bp.measured_at, '1970-01-01 00:00:00'),
           COALESCE(hr.measured_at, '1970-01-01 00:00:00'),
           COALESCE(bs.measured_at, '1970-01-01 00:00:00')
         ) AS last_update
       FROM users u
       LEFT JOIN (
         SELECT h.user_id, h.value_high, h.value_low, h.measured_at
         FROM health_records h
         INNER JOIN (
           SELECT user_id, MAX(id) AS max_id
           FROM health_records
           WHERE metric_type = 'blood_pressure'
           GROUP BY user_id
         ) x ON x.max_id = h.id
       ) bp ON bp.user_id = u.id
       LEFT JOIN (
         SELECT h.user_id, h.value, h.measured_at
         FROM health_records h
         INNER JOIN (
           SELECT user_id, MAX(id) AS max_id
           FROM health_records
           WHERE metric_type = 'heart_rate'
           GROUP BY user_id
         ) x ON x.max_id = h.id
       ) hr ON hr.user_id = u.id
       LEFT JOIN (
         SELECT h.user_id, h.value, h.measured_at
         FROM health_records h
         INNER JOIN (
           SELECT user_id, MAX(id) AS max_id
           FROM health_records
           WHERE metric_type = 'blood_sugar'
           GROUP BY user_id
         ) x ON x.max_id = h.id
       ) bs ON bs.user_id = u.id
       ${whereSql}
       ORDER BY last_update DESC, u.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },


  async countHealthOverview({ search = '', communityId = null }) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
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
       FROM users u
       ${whereSql}`,
      values
    );
    return Number(rows && rows[0] ? rows[0].total : 0);
  },


  async listMedicationLogs(
    { search = '', status = '', startDate = null, endDate = null, communityId = null },
    { pageSize = 10, offset = 0 } = {}
  ) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        '(u.nickname LIKE ? OR u.phone LIKE ? OR p.medication_name LIKE ? OR CAST(l.id AS CHAR) LIKE ?)'
      );
      values.push(keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push('l.status = ?');
      values.push(status);
    }

    if (startDate) {
      where.push('DATE(l.scheduled_time) >= ?');
      values.push(startDate);
    }

    if (endDate) {
      where.push('DATE(l.scheduled_time) <= ?');
      values.push(endDate);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         l.id,
         l.user_id,
         u.nickname,
         u.phone,
         l.plan_id,
         p.medication_name,
         p.dosage,
         l.scheduled_time,
         l.actual_time,
         l.status,
         l.reminder_sent,
         l.second_reminder_sent,
         l.family_notified,
         l.created_at,
         l.updated_at
       FROM medication_logs l
       LEFT JOIN medication_plans p ON p.id = l.plan_id
       LEFT JOIN users u ON u.id = l.user_id
       ${whereSql}
       ORDER BY l.scheduled_time DESC, l.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },


  async countMedicationLogs({
    search = '',
    status = '',
    startDate = null,
    endDate = null,
    communityId = null,
  }) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        '(u.nickname LIKE ? OR u.phone LIKE ? OR p.medication_name LIKE ? OR CAST(l.id AS CHAR) LIKE ?)'
      );
      values.push(keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push('l.status = ?');
      values.push(status);
    }

    if (startDate) {
      where.push('DATE(l.scheduled_time) >= ?');
      values.push(startDate);
    }

    if (endDate) {
      where.push('DATE(l.scheduled_time) <= ?');
      values.push(endDate);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM medication_logs l
       LEFT JOIN medication_plans p ON p.id = l.plan_id
       LEFT JOIN users u ON u.id = l.user_id
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },


  async updateMedicationLogStatus(logId, status) {
    const [result] = await query(
      `UPDATE medication_logs
       SET status = ?,
           actual_time = CASE WHEN ? = 'pending' THEN NULL ELSE NOW() END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, status, Number(logId)]
    );

    return Number(result && result.affectedRows ? result.affectedRows : 0);
  },


  async getMedicationLogById(logId, communityId = null) {
    const values = [Number(logId)];
    let sql = `SELECT
         l.id,
         l.user_id,
         u.nickname,
         u.phone,
         l.plan_id,
         p.medication_name,
         p.dosage,
         l.scheduled_time,
         l.actual_time,
         l.status,
         l.reminder_sent,
         l.second_reminder_sent,
         l.family_notified,
         l.created_at,
         l.updated_at
       FROM medication_logs l
       LEFT JOIN medication_plans p ON p.id = l.plan_id
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.id = ?`;

    if (communityId) {
      sql += ' AND u.community_id = ?';
      values.push(Number(communityId));
    }

    sql += ' LIMIT 1';

    const [rows] = await query(sql, values);

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },


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
