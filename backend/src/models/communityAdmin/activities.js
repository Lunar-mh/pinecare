'use strict';

const { query } = require('./shared');

module.exports = {
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
};
