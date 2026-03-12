'use strict';

const { query } = require('../../config/database');

const ORDER_STATUS_LIST = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];

function generateOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `ORDER-${y}${m}${d}-${random}`;
}

function buildOrderWhere(communityId, filters = {}) {
  const where = ['so.community_id = ?'];
  const params = [communityId];

  if (filters.status) { where.push('so.status = ?'); params.push(filters.status); }
  if (filters.serviceType) { where.push('so.service_type = ?'); params.push(filters.serviceType); }
  if (filters.elderId) { where.push('so.elder_id = ?'); params.push(filters.elderId); }
  if (filters.volunteerId) { where.push('so.volunteer_id = ?'); params.push(filters.volunteerId); }
  if (filters.startDate) { where.push('so.created_at >= ?'); params.push(filters.startDate); }
  if (filters.endDate) { where.push('so.created_at <= ?'); params.push(filters.endDate); }

  return { whereSql: where.join(' AND ' ), params };
}

module.exports = {
  query,
  ORDER_STATUS_LIST,
  generateOrderNo,
  buildOrderWhere,
};
