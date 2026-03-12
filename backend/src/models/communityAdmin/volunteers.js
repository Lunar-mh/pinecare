'use strict';

const { query } = require('./shared');

module.exports = {
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

  async findVolunteerInCommunity(communityId, volunteerUserId) {
    const [rows] = await query(
      `SELECT ca.id, ca.user_id, ca.community_id, ca.role, u.name, u.phone
       FROM community_admins ca
       INNER JOIN users u ON u.id = ca.user_id
       WHERE ca.community_id = ?
         AND ca.user_id = ?
         AND ca.role = 'volunteer'
       LIMIT 1`,
      [Number(communityId), Number(volunteerUserId)]
    );

    return rows[0] || null;
  },


};
