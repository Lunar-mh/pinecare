'use strict';

const { query, buildWhereSql } = require('../common');

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
};
