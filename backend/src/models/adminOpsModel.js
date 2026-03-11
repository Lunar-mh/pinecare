'use strict';

const { query } = require('../config/database');

function buildUserSearchWhere(search, tableAlias = 'u') {
  const text = String(search || '').trim();
  if (!text) {
    return { whereSql: '', values: [] };
  }

  const keyword = `%${text}%`;
  return {
    whereSql: `WHERE (${tableAlias}.nickname LIKE ? OR ${tableAlias}.phone LIKE ? OR CAST(${tableAlias}.id AS CHAR) LIKE ?)`,
    values: [keyword, keyword, keyword],
  };
}

function buildWhereSql(whereList) {
  return whereList.length > 0 ? `WHERE ${whereList.join(' AND ')}` : '';
}

let familyBindingColumnsCache = null;
let familyBindingColumnsPromise = null;

async function resolveFamilyBindingColumns() {
  if (familyBindingColumnsCache) {
    return familyBindingColumnsCache;
  }

  if (familyBindingColumnsPromise) {
    return familyBindingColumnsPromise;
  }

  familyBindingColumnsPromise = (async () => {
    const [rows] = await query('SHOW COLUMNS FROM family_bindings');
    const columns = new Set(
      (Array.isArray(rows) ? rows : []).map((item) => String(item.Field || ''))
    );

    familyBindingColumnsCache = {
      elderColumn: columns.has('elder_id') ? 'elder_id' : 'user_id',
      familyColumn: columns.has('family_id') ? 'family_id' : 'family_user_id',
      statusColumn: columns.has('status')
        ? 'status'
        : columns.has('binding_status')
          ? 'binding_status'
          : 'status',
    };

    return familyBindingColumnsCache;
  })();

  try {
    return await familyBindingColumnsPromise;
  } finally {
    familyBindingColumnsPromise = null;
  }
}

const adminOpsModel = {
  async listHealthOverview({ search = '', communityId = null }, { pageSize = 10, offset = 0 } = {}) {
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

    const [rows] = await query(
      sql,
      values
    );

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

    const [rows] = await query(
      sql,
      values
    );

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

  async listMedicalReports(
    { search = '', reportType = '', startDate = null, endDate = null },
    { pageSize = 10, offset = 0 } = {}
  ) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        '(u.nickname LIKE ? OR u.phone LIKE ? OR r.report_no LIKE ? OR CAST(r.id AS CHAR) LIKE ?)'
      );
      values.push(keyword, keyword, keyword, keyword);
    }

    if (reportType) {
      where.push('r.report_type = ?');
      values.push(reportType);
    }

    if (startDate) {
      where.push('r.report_date >= ?');
      values.push(startDate);
    }

    if (endDate) {
      where.push('r.report_date <= ?');
      values.push(endDate);
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         r.id,
         r.user_id,
         r.report_no,
         r.report_type,
         r.report_date,
         r.report_url,
         r.report_data,
         r.sync_status,
         r.created_at,
         u.nickname,
         u.phone
       FROM medical_reports r
       LEFT JOIN users u ON u.id = r.user_id
       ${whereSql}
       ORDER BY r.report_date DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async countMedicalReports({ search = '', reportType = '', startDate = null, endDate = null }) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        '(u.nickname LIKE ? OR u.phone LIKE ? OR r.report_no LIKE ? OR CAST(r.id AS CHAR) LIKE ?)'
      );
      values.push(keyword, keyword, keyword, keyword);
    }

    if (reportType) {
      where.push('r.report_type = ?');
      values.push(reportType);
    }

    if (startDate) {
      where.push('r.report_date >= ?');
      values.push(startDate);
    }

    if (endDate) {
      where.push('r.report_date <= ?');
      values.push(endDate);
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM medical_reports r
       LEFT JOIN users u ON u.id = r.user_id
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },

  async listSosEvents(
    { search = '', status = '', communityId = null },
    { pageSize = 10, offset = 0 } = {}
  ) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        '(u.nickname LIKE ? OR u.phone LIKE ? OR e.address LIKE ? OR CAST(e.id AS CHAR) LIKE ?)'
      );
      values.push(keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push('e.event_status = ?');
      values.push(status);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT
         e.id,
         e.user_id,
         u.nickname,
         u.phone,
         e.trigger_type,
         e.latitude,
         e.longitude,
         e.address,
         e.event_status,
         e.created_at,
         e.confirmed_at,
         e.resolved_at,
         e.cancelled_at,
         e.updated_at
       FROM sos_events e
       LEFT JOIN users u ON u.id = e.user_id
       ${whereSql}
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT ? OFFSET ?`,
      [...values, Number(pageSize), Number(offset)]
    );

    return Array.isArray(rows) ? rows : [];
  },

  async countSosEvents({ search = '', status = '', communityId = null }) {
    const where = [];
    const values = [];

    const text = String(search || '').trim();
    if (text) {
      const keyword = `%${text}%`;
      where.push(
        '(u.nickname LIKE ? OR u.phone LIKE ? OR e.address LIKE ? OR CAST(e.id AS CHAR) LIKE ?)'
      );
      values.push(keyword, keyword, keyword, keyword);
    }

    if (status) {
      where.push('e.event_status = ?');
      values.push(status);
    }

    if (communityId) {
      where.push('u.community_id = ?');
      values.push(Number(communityId));
    }

    const whereSql = buildWhereSql(where);

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM sos_events e
       LEFT JOIN users u ON u.id = e.user_id
       ${whereSql}`,
      values
    );

    return Number(rows && rows[0] ? rows[0].total : 0);
  },

  async getSosEventById(eventId, communityId = null) {
    const values = [Number(eventId)];
    let sql = `SELECT e.id, e.user_id, e.trigger_type, e.latitude, e.longitude, e.address, e.event_status,
                      e.created_at, e.confirmed_at, e.resolved_at, e.cancelled_at, e.updated_at
               FROM sos_events e
               LEFT JOIN users u ON u.id = e.user_id
               WHERE e.id = ?`;

    if (communityId) {
      sql += ' AND u.community_id = ?';
      values.push(Number(communityId));
    }

    sql += ' LIMIT 1';

    const [rows] = await query(sql, values);

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },

  async updateSosEventStatus(eventId, fromStatus, toStatus) {
    const [result] = await query(
      `UPDATE sos_events
       SET event_status = ?,
           confirmed_at = CASE WHEN ? = 'confirmed' AND confirmed_at IS NULL THEN NOW() ELSE confirmed_at END,
           resolved_at = CASE WHEN ? = 'resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
           cancelled_at = CASE WHEN ? = 'cancelled' AND cancelled_at IS NULL THEN NOW() ELSE cancelled_at END,
           updated_at = NOW()
       WHERE id = ? AND event_status = ?`,
      [toStatus, toStatus, toStatus, toStatus, Number(eventId), fromStatus]
    );

    return Number(result && result.affectedRows ? result.affectedRows : 0);
  },

  async summarizeSosNotifications(eventIds = []) {
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return [];
    }

    const placeholders = eventIds.map(() => '?').join(', ');
    const [rows] = await query(
      `SELECT sos_event_id,
              notify_type,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
              SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count
       FROM sos_notifications
       WHERE sos_event_id IN (${placeholders})
       GROUP BY sos_event_id, notify_type`,
      eventIds
    );

    return Array.isArray(rows) ? rows : [];
  },

  async listFallEvents({ search = '', status = '' }, { pageSize = 10, offset = 0 } = {}) {
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

  async countFallEvents({ search = '', status = '' }) {
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

  async listDrugInteractions({ search = '', status = '' }, { pageSize = 100, offset = 0 } = {}) {
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

  async getDrugInteractionById(interactionId) {
    const [rows] = await query(
      `SELECT id, user_id, drug_a, drug_b, level, mechanism, risk_description, suggestion,
              status, check_batch_id, created_at
       FROM drug_interactions
       WHERE id = ?
       LIMIT 1`,
      [Number(interactionId)]
    );

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },

  async listTimeBankServiceHistory(
    { search = '', status = '' },
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

  async countTimeBankServiceHistory({ search = '', status = '' }) {
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

  async getTimeBankServiceRecordById(recordId) {
    const [rows] = await query(
      `SELECT id, provider_id, recipient_id, service_type, start_time, end_time,
              duration_hours, time_coins, status, created_at
       FROM service_records
       WHERE id = ?
       LIMIT 1`,
      [Number(recordId)]
    );

    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },

  async listTimeBankExchangeHistory({ limit = 200 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);

    const [rows] = await query(
      `SELECT
         er.id,
         er.user_id,
         er.exchange_type,
         er.item_name,
         er.coins_required,
         er.status,
         er.created_at,
         er.completed_at
       FROM exchange_records er
       ORDER BY er.id DESC
       LIMIT ?`,
      [safeLimit]
    );

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
};

module.exports = adminOpsModel;
