'use strict';

const { query } = require('../config/database');

const ORDER_STATUS_LIST = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];

/**
 * 生成工单号：ORDER-YYYYMMDD-6位随机数
 * @returns {string}
 */
function generateOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `ORDER-${y}${m}${d}-${random}`;
}

/**
 * 构造工单过滤条件
 * @param {number} communityId
 * @param {object} filters
 * @returns {{ whereSql: string, params: any[] }}
 */
function buildOrderWhere(communityId, filters = {}) {
  const where = ['so.community_id = ?'];
  const params = [communityId];

  if (filters.status) {
    where.push('so.status = ?');
    params.push(filters.status);
  }

  if (filters.serviceType) {
    where.push('so.service_type = ?');
    params.push(filters.serviceType);
  }

  if (filters.elderId) {
    where.push('so.elder_id = ?');
    params.push(filters.elderId);
  }

  if (filters.volunteerId) {
    where.push('so.volunteer_id = ?');
    params.push(filters.volunteerId);
  }

  if (filters.startDate) {
    where.push('so.created_at >= ?');
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    where.push('so.created_at <= ?');
    params.push(filters.endDate);
  }

  return {
    whereSql: where.join(' AND '),
    params,
  };
}

const communityAdminModel = {
  ORDER_STATUS_LIST,

  generateOrderNo,

  /**
   * 分页查询志愿者
   * @param {number} communityId
   * @param {object} filters
   * @param {{ page: number, pageSize: number }} pagination
   * @returns {Promise<Array>}
   */
  async listVolunteers(communityId, filters = {}, pagination = {}) {
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const where = ['ca.community_id = ?', "ca.role = 'volunteer'"];
    const params = [communityId];

    if (filters.keyword) {
      where.push('(u.name LIKE ? OR u.phone LIKE ?)');
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    const [rows] = await query(
      `SELECT
         ca.id,
         ca.user_id,
         ca.community_id,
         ca.role,
         ca.created_at,
         u.name,
         u.phone
       FROM community_admins ca
       INNER JOIN users u ON u.id = ca.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY ca.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return rows;
  },

  /**
   * 统计志愿者总数
   * @param {number} communityId
   * @param {object} filters
   * @returns {Promise<number>}
   */
  async countVolunteers(communityId, filters = {}) {
    const where = ['ca.community_id = ?', "ca.role = 'volunteer'"];
    const params = [communityId];

    if (filters.keyword) {
      where.push('(u.name LIKE ? OR u.phone LIKE ?)');
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM community_admins ca
       INNER JOIN users u ON u.id = ca.user_id
       WHERE ${where.join(' AND ')}`,
      params
    );

    return rows[0] ? Number(rows[0].total) : 0;
  },

  /**
   * 分页查询工单
   * @param {number} communityId
   * @param {object} filters
   * @param {{ page: number, pageSize: number }} pagination
   * @returns {Promise<Array>}
   */
  async listOrders(communityId, filters = {}, pagination = {}) {
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const { whereSql, params } = buildOrderWhere(communityId, filters);

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
         volunteer.name AS volunteer_name
       FROM service_orders so
       LEFT JOIN users elder ON elder.id = so.elder_id
       LEFT JOIN users volunteer ON volunteer.id = so.volunteer_id
       WHERE ${whereSql}
       ORDER BY so.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return rows;
  },

  /**
   * 统计工单总数
   * @param {number} communityId
   * @param {object} filters
   * @returns {Promise<number>}
   */
  async countOrders(communityId, filters = {}) {
    const { whereSql, params } = buildOrderWhere(communityId, filters);
    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM service_orders so
       WHERE ${whereSql}`,
      params
    );
    return rows[0] ? Number(rows[0].total) : 0;
  },

  /**
   * 创建工单（自动生成唯一工单号）
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createOrder(data) {
    const payload = {
      communityId: Number(data.communityId),
      serviceType: data.serviceType,
      elderId: Number(data.elderId),
      volunteerId: data.volunteerId ? Number(data.volunteerId) : null,
      status: data.status || 'pending',
      scheduledAt: data.scheduledAt || null,
      completedAt: data.completedAt || null,
    };

    let lastError;

    for (let i = 0; i < 8; i += 1) {
      const orderNo = i === 0 && data.orderNo ? data.orderNo : generateOrderNo();

      try {
        const [result] = await query(
          `INSERT INTO service_orders
           (order_no, community_id, service_type, elder_id, volunteer_id, status, scheduled_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderNo,
            payload.communityId,
            payload.serviceType,
            payload.elderId,
            payload.volunteerId,
            payload.status,
            payload.scheduledAt,
            payload.completedAt,
          ]
        );

        return {
          id: result.insertId,
          order_no: orderNo,
          community_id: payload.communityId,
          service_type: payload.serviceType,
          elder_id: payload.elderId,
          volunteer_id: payload.volunteerId,
          status: payload.status,
          scheduled_at: payload.scheduledAt,
          completed_at: payload.completedAt,
        };
      } catch (error) {
        lastError = error;
        if (error && error.code === 'ER_DUP_ENTRY') {
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('工单号生成失败，请稍后重试');
  },

  /**
   * 分页查询活动
   * @param {number} communityId
   * @param {object} filters
   * @param {{ page: number, pageSize: number }} pagination
   * @returns {Promise<Array>}
   */
  async listActivities(communityId, filters = {}, pagination = {}) {
    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const where = ['community_id = ?'];
    const params = [communityId];

    if (filters.startTime) {
      where.push('start_time >= ?');
      params.push(filters.startTime);
    }

    if (filters.endTime) {
      where.push('end_time <= ?');
      params.push(filters.endTime);
    }

    if (filters.keyword) {
      where.push('title LIKE ?');
      params.push(`%${filters.keyword}%`);
    }

    const [rows] = await query(
      `SELECT id, community_id, title, content, start_time, end_time, max_participants, registered_count, created_at
       FROM community_activities
       WHERE ${where.join(' AND ')}
       ORDER BY start_time DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return rows;
  },

  /**
   * 统计活动总数
   * @param {number} communityId
   * @param {object} filters
   * @returns {Promise<number>}
   */
  async countActivities(communityId, filters = {}) {
    const where = ['community_id = ?'];
    const params = [communityId];

    if (filters.startTime) {
      where.push('start_time >= ?');
      params.push(filters.startTime);
    }

    if (filters.endTime) {
      where.push('end_time <= ?');
      params.push(filters.endTime);
    }

    if (filters.keyword) {
      where.push('title LIKE ?');
      params.push(`%${filters.keyword}%`);
    }

    const [rows] = await query(
      `SELECT COUNT(1) AS total
       FROM community_activities
       WHERE ${where.join(' AND ')}`,
      params
    );

    return rows[0] ? Number(rows[0].total) : 0;
  },

  /**
   * 创建活动
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createActivity(data) {
    const [result] = await query(
      `INSERT INTO community_activities
       (community_id, title, content, start_time, end_time, max_participants, registered_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        Number(data.communityId),
        data.title,
        data.content,
        data.startTime,
        data.endTime,
        data.maxParticipants || null,
      ]
    );

    return {
      id: result.insertId,
      community_id: Number(data.communityId),
      title: data.title,
      content: data.content,
      start_time: data.startTime,
      end_time: data.endTime,
      max_participants: data.maxParticipants || null,
      registered_count: 0,
    };
  },

  /**
   * 查询社区统计基础数据
   * @param {number} communityId
   * @returns {Promise<object>}
   */
  async getStatsData(communityId) {
    const [overviewRows] = await query(
      `SELECT
         COUNT(DISTINCT so.elder_id) AS active_elders,
         (
           SELECT COUNT(1)
           FROM community_admins ca
           WHERE ca.community_id = ? AND ca.role = 'volunteer'
         ) AS volunteers,
         COUNT(1) AS total_orders,
         COALESCE(SUM(
           CASE
             WHEN so.status = 'completed' AND so.scheduled_at IS NOT NULL AND so.completed_at IS NOT NULL
             THEN GREATEST(TIMESTAMPDIFF(MINUTE, so.scheduled_at, so.completed_at), 0)
             ELSE 0
           END
         ), 0) / 60 AS total_service_hours
       FROM service_orders so
       WHERE so.community_id = ?`,
      [communityId, communityId]
    );

    const overview = overviewRows[0] || {};

    const [distributionRows] = await query(
      `SELECT so.status, COUNT(1) AS count
       FROM service_orders so
       WHERE so.community_id = ?
       GROUP BY so.status`,
      [communityId]
    );

    const orderDistribution = {
      pending: 0,
      assigned: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };

    distributionRows.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(orderDistribution, item.status)) {
        orderDistribution[item.status] = Number(item.count);
      }
    });

    return {
      overview: {
        active_elders: Number(overview.active_elders || 0),
        volunteers: Number(overview.volunteers || 0),
        total_orders: Number(overview.total_orders || 0),
        total_service_hours: Number(overview.total_service_hours || 0),
      },
      order_distribution: orderDistribution,
    };
  },
};

module.exports = communityAdminModel;
