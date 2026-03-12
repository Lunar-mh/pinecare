'use strict';

const { query, ORDER_STATUS_LIST, generateOrderNo, buildOrderWhere } = require('./shared');

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
         elder.name AS elder_name,
         volunteer.name AS volunteer_name
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
