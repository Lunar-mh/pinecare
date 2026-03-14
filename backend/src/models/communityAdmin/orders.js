'use strict';

const { query, ORDER_STATUS_LIST, generateOrderNo, buildOrderWhere } = require('./shared');

const USER_DISPLAY_NAME_SQL = "COALESCE(NULLIF({alias}.real_name, ''), NULLIF({alias}.nickname, ''), CONCAT('User', {alias}.id))";

function userDisplayName(alias) {
  return USER_DISPLAY_NAME_SQL.replace(/\{alias\}/g, alias);
}

module.exports = {
  ORDER_STATUS_LIST,
  generateOrderNo,

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
         ${userDisplayName('elder')} AS elder_name,
         ${userDisplayName('volunteer')} AS volunteer_name
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

  async findOrderById(communityId, orderId) {
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
         ${userDisplayName('elder')} AS elder_name,
         ${userDisplayName('volunteer')} AS volunteer_name
       FROM service_orders so
       LEFT JOIN users elder ON elder.id = so.elder_id
       LEFT JOIN users volunteer ON volunteer.id = so.volunteer_id
       WHERE so.community_id = ?
         AND so.id = ?
       LIMIT 1`,
      [Number(communityId), Number(orderId)]
    );

    return rows[0] || null;
  },

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

    throw lastError || new Error('工单编号生成失败，请稍后重试');
  },

  async assignOrder(communityId, orderId, volunteerId, scheduledAt = null) {
    const [result] = await query(
      `UPDATE service_orders
       SET volunteer_id = ?,
           status = 'assigned',
           scheduled_at = COALESCE(?, scheduled_at)
       WHERE community_id = ?
         AND id = ?
         AND status = 'pending'`,
      [Number(volunteerId), scheduledAt, Number(communityId), Number(orderId)]
    );

    return result;
  },

  async updateOrderStatus(communityId, orderId, status, payload = {}) {
    const sets = ['status = ?'];
    const params = [status];

    if (Object.prototype.hasOwnProperty.call(payload, 'completedAt')) {
      sets.push('completed_at = ?');
      params.push(payload.completedAt);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'volunteerId')) {
      sets.push('volunteer_id = ?');
      params.push(payload.volunteerId);
    }

    const [result] = await query(
      `UPDATE service_orders
       SET ${sets.join(', ')}
       WHERE community_id = ?
         AND id = ?`,
      [...params, Number(communityId), Number(orderId)]
    );

    return result;
  },
};
