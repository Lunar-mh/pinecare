'use strict';

const { query } = require('../config/database');

function buildTaskWhere(scope, filters = {}) {
  const where = [
    'so.community_id = ?',
    '(so.volunteer_id = ? OR (so.volunteer_id IS NULL AND so.status = ?))',
  ];
  const params = [Number(scope.communityId), Number(scope.userId), 'pending'];

  if (filters.status) {
    where.push('so.status = ?');
    params.push(filters.status);
  }

  if (filters.keyword) {
    where.push('(so.order_no LIKE ? OR so.service_type LIKE ? OR elder.name LIKE ?)');
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
  }

  return {
    whereSql: where.join(' AND '),
    params,
  };
}

const volunteerModel = {
  async findVolunteerScopeByUserId(userId) {
    const [rows] = await query(
      `SELECT ca.id, ca.user_id, ca.community_id, ca.role, u.name, u.phone
       FROM community_admins ca
       INNER JOIN users u ON u.id = ca.user_id
       WHERE ca.user_id = ?
         AND ca.role = 'volunteer'
       ORDER BY ca.id ASC
       LIMIT 1`,
      [Number(userId)]
    );

    return rows[0] || null;
  },

  async listTasksByVolunteer(scope, filters = {}, pagination = {}) {
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const { whereSql, params } = buildTaskWhere(scope, filters);

    const [rows] = await query(
      `SELECT
         so.id,
         so.order_no,
         so.community_id,
         so.service_type,
         so.elder_id,
         so.volunteer_id,
         so.status,
         so.scheduled_at,
         so.completed_at,
         so.created_at,
         elder.name AS elder_name,
         elder.phone AS elder_phone
       FROM service_orders so
       LEFT JOIN users elder ON elder.id = so.elder_id
       WHERE ${whereSql}
       ORDER BY
         CASE
           WHEN so.status = 'pending' THEN 1
           WHEN so.status = 'assigned' THEN 2
           WHEN so.status = 'processing' THEN 3
           WHEN so.status = 'completed' THEN 4
           ELSE 5
         END ASC,
         so.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return rows;
  },

  async countTasksByVolunteer(scope, filters = {}) {
    const { whereSql, params } = buildTaskWhere(scope, filters);
    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM service_orders so
       LEFT JOIN users elder ON elder.id = so.elder_id
       WHERE ${whereSql}`,
      params
    );

    return rows[0] ? Number(rows[0].total) : 0;
  },

  async countTaskSummary(scope) {
    const [rows] = await query(
      `SELECT
         SUM(CASE WHEN so.volunteer_id IS NULL AND so.status = 'pending' THEN 1 ELSE 0 END) AS available_count,
         SUM(CASE WHEN so.volunteer_id = ? AND so.status = 'assigned' THEN 1 ELSE 0 END) AS assigned_count,
         SUM(CASE WHEN so.volunteer_id = ? AND so.status = 'processing' THEN 1 ELSE 0 END) AS processing_count,
         SUM(CASE WHEN so.volunteer_id = ? AND so.status = 'completed' THEN 1 ELSE 0 END) AS completed_count
       FROM service_orders so
       WHERE so.community_id = ?`,
      [Number(scope.userId), Number(scope.userId), Number(scope.userId), Number(scope.communityId)]
    );

    const summary = rows[0] || {};
    return {
      available_count: Number(summary.available_count || 0),
      assigned_count: Number(summary.assigned_count || 0),
      processing_count: Number(summary.processing_count || 0),
      completed_count: Number(summary.completed_count || 0),
    };
  },

  async findTaskByIdForVolunteer(scope, taskId) {
    const [rows] = await query(
      `SELECT
         so.id,
         so.order_no,
         so.community_id,
         so.service_type,
         so.elder_id,
         so.volunteer_id,
         so.status,
         so.scheduled_at,
         so.completed_at,
         so.created_at,
         elder.name AS elder_name,
         elder.phone AS elder_phone
       FROM service_orders so
       LEFT JOIN users elder ON elder.id = so.elder_id
       WHERE so.id = ?
         AND so.community_id = ?
         AND (so.volunteer_id = ? OR (so.volunteer_id IS NULL AND so.status = 'pending'))
       LIMIT 1`,
      [Number(taskId), Number(scope.communityId), Number(scope.userId)]
    );

    return rows[0] || null;
  },

  async acceptTask(taskId, scope) {
    const [result] = await query(
      `UPDATE service_orders
       SET volunteer_id = ?, status = 'assigned'
       WHERE id = ?
         AND community_id = ?
         AND volunteer_id IS NULL
         AND status = 'pending'`,
      [Number(scope.userId), Number(taskId), Number(scope.communityId)]
    );

    return result;
  },

  async updateOwnedTaskStatus(taskId, volunteerUserId, status, extra = {}) {
    const sets = ['status = ?'];
    const params = [status];

    if (Object.prototype.hasOwnProperty.call(extra, 'completedAt')) {
      sets.push('completed_at = ?');
      params.push(extra.completedAt);
    }

    const [result] = await query(
      `UPDATE service_orders
       SET ${sets.join(', ')}
       WHERE id = ?
         AND volunteer_id = ?`,
      [...params, Number(taskId), Number(volunteerUserId)]
    );

    return result;
  },

  async upsertAttendance(payload) {
    const [result] = await query(
      `INSERT INTO volunteer_attendance_logs
       (order_id, community_id, volunteer_user_id, check_in_at, check_out_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         check_in_at = COALESCE(VALUES(check_in_at), check_in_at),
         check_out_at = COALESCE(VALUES(check_out_at), check_out_at)`,
      [
        Number(payload.orderId),
        Number(payload.communityId),
        Number(payload.volunteerUserId),
        payload.checkInAt || null,
        payload.checkOutAt || null,
      ]
    );

    return result;
  },

  async findProfileByUserId(userId, communityId) {
    const [rows] = await query(
      `SELECT
         u.id,
         u.name,
         u.phone,
         ca.community_id,
         ca.role,
         ca.created_at
       FROM community_admins ca
       INNER JOIN users u ON u.id = ca.user_id
       WHERE ca.user_id = ?
         AND ca.community_id = ?
         AND ca.role = 'volunteer'
       LIMIT 1`,
      [Number(userId), Number(communityId)]
    );

    return rows[0] || null;
  },

  async listTrainingByVolunteerId(scope, filters = {}, pagination = {}) {
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const where = ['community_id = ?', 'volunteer_user_id = ?'];
    const params = [Number(scope.communityId), Number(scope.userId)];

    if (filters.status) {
      where.push('training_status = ?');
      params.push(filters.status);
    }

    const [rows] = await query(
      `SELECT
         id,
         community_id,
         volunteer_user_id,
         training_title,
         training_status,
         training_at,
         expires_at,
         certificate_url,
         created_at,
         updated_at
       FROM volunteer_training_records
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return rows;
  },

  async countTrainingByVolunteerId(scope, filters = {}) {
    const where = ['community_id = ?', 'volunteer_user_id = ?'];
    const params = [Number(scope.communityId), Number(scope.userId)];

    if (filters.status) {
      where.push('training_status = ?');
      params.push(filters.status);
    }

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM volunteer_training_records
       WHERE ${where.join(' AND ')}`,
      params
    );

    return rows[0] ? Number(rows[0].total) : 0;
  },
};

module.exports = volunteerModel;
