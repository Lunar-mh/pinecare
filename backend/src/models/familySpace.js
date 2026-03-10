'use strict';

const { query } = require('../config/database');

function unwrapRows(result) {
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

async function execute(sql, params = []) {
  const result = await query(sql, params);
  return unwrapRows(result);
}

const FAMILY_MEMBERSHIP_SQL = `
  SELECT elder_user_id AS family_id, elder_user_id AS user_id
  FROM family_bindings
  WHERE binding_status = 'approved'
  UNION
  SELECT elder_user_id AS family_id, family_user_id AS user_id
  FROM family_bindings
  WHERE binding_status = 'approved'
    AND family_user_id IS NOT NULL
`;

const familySpaceModel = {
  async getUserFamilyIds(userId) {
    const rows = await execute(
      `SELECT DISTINCT m.family_id
       FROM (${FAMILY_MEMBERSHIP_SQL}) m
       WHERE m.user_id = ?
       ORDER BY m.family_id ASC`,
      [userId]
    );

    return Array.isArray(rows) ? rows.map((item) => Number(item.family_id)) : [];
  },

  async checkUserInFamily(userId, familyId) {
    const rows = await execute(
      `SELECT 1
       FROM (${FAMILY_MEMBERSHIP_SQL}) m
       WHERE m.family_id = ?
         AND m.user_id = ?
       LIMIT 1`,
      [familyId, userId]
    );

    return Array.isArray(rows) && rows.length > 0;
  },

  async findSharedFamilyId(fromUserId, toUserId) {
    const rows = await execute(
      `SELECT a.family_id
       FROM (${FAMILY_MEMBERSHIP_SQL}) a
       INNER JOIN (${FAMILY_MEMBERSHIP_SQL}) b
         ON a.family_id = b.family_id
       WHERE a.user_id = ?
         AND b.user_id = ?
       ORDER BY a.family_id ASC
       LIMIT 1`,
      [fromUserId, toUserId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return Number(rows[0].family_id);
  },

  async createVoiceMessage(payload) {
    const [result] = await query(
      `INSERT INTO voice_messages (from_user_id, to_user_id, audio_url, duration_seconds, is_played)
       VALUES (?, ?, ?, ?, 0)`,
      [payload.fromUserId, payload.toUserId, payload.audioUrl, payload.durationSeconds]
    );

    const rows = await execute(
      `SELECT id, from_user_id, to_user_id, audio_url, duration_seconds, is_played, created_at
       FROM voice_messages
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return rows[0] || null;
  },

  async listReceivedVoiceMessages(userId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    const countRows = await execute(
      `SELECT COUNT(*) AS total
       FROM voice_messages
       WHERE to_user_id = ?`,
      [userId]
    );

    const rows = await execute(
      `SELECT vm.id,
              vm.from_user_id,
              vm.to_user_id,
              vm.audio_url,
              vm.duration_seconds,
              vm.is_played,
              vm.created_at,
              u.nickname AS from_user_nickname,
              u.real_name AS from_user_real_name,
              u.avatar_url AS from_user_avatar_url
       FROM voice_messages vm
       LEFT JOIN users u ON u.id = vm.from_user_id
       WHERE vm.to_user_id = ?
       ORDER BY vm.created_at DESC, vm.id DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    return {
      total: Number((countRows[0] && countRows[0].total) || 0),
      list: Array.isArray(rows) ? rows : [],
    };
  },

  async createAlbumPhoto(payload) {
    const [result] = await query(
      `INSERT INTO family_albums (user_id, family_id, image_url, caption)
       VALUES (?, ?, ?, ?)`,
      [payload.userId, payload.familyId, payload.imageUrl, payload.caption || null]
    );

    const rows = await execute(
      `SELECT id, user_id, family_id, image_url, caption, created_at
       FROM family_albums
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return rows[0] || null;
  },

  async listAlbumByFamilyId(familyId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    const countRows = await execute(
      `SELECT COUNT(*) AS total
       FROM family_albums
       WHERE family_id = ?`,
      [familyId]
    );

    const rows = await execute(
      `SELECT fa.id,
              fa.user_id,
              fa.family_id,
              fa.image_url,
              fa.caption,
              fa.created_at,
              u.nickname AS user_nickname,
              u.real_name AS user_real_name,
              u.avatar_url AS user_avatar_url
       FROM family_albums fa
       LEFT JOIN users u ON u.id = fa.user_id
       WHERE fa.family_id = ?
       ORDER BY fa.created_at DESC, fa.id DESC
       LIMIT ? OFFSET ?`,
      [familyId, pageSize, offset]
    );

    return {
      total: Number((countRows[0] && countRows[0].total) || 0),
      list: Array.isArray(rows) ? rows : [],
    };
  },

  async addFamilyPoints(payload) {
    const [result] = await query(
      `INSERT INTO family_points (user_id, family_id, points, action_type)
       VALUES (?, ?, ?, ?)`,
      [payload.userId, payload.familyId, payload.points, payload.actionType]
    );

    const rows = await execute(
      `SELECT id, user_id, family_id, points, action_type, created_at
       FROM family_points
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return rows[0] || null;
  },

  async getUserPointsTotal(userId) {
    const rows = await execute(
      `SELECT COALESCE(SUM(points), 0) AS total_points
       FROM family_points
       WHERE user_id = ?`,
      [userId]
    );

    return Number((rows[0] && rows[0].total_points) || 0);
  },

  async listUserPointsDetails(userId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    const countRows = await execute(
      `SELECT COUNT(*) AS total
       FROM family_points
       WHERE user_id = ?`,
      [userId]
    );

    const rows = await execute(
      `SELECT id, user_id, family_id, points, action_type, created_at
       FROM family_points
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    return {
      total: Number((countRows[0] && countRows[0].total) || 0),
      list: Array.isArray(rows) ? rows : [],
    };
  },

  async getFamilyLeaderboard(familyId, page, pageSize) {
    const offset = (page - 1) * pageSize;

    const countRows = await execute(
      `SELECT COUNT(*) AS total
       FROM (
         SELECT DISTINCT m.user_id
         FROM (${FAMILY_MEMBERSHIP_SQL}) m
         WHERE m.family_id = ?
       ) members`,
      [familyId]
    );

    const rows = await execute(
      `SELECT members.user_id,
              u.nickname,
              u.real_name,
              u.avatar_url,
              COALESCE(SUM(fp.points), 0) AS total_points
       FROM (
         SELECT DISTINCT m.user_id
         FROM (${FAMILY_MEMBERSHIP_SQL}) m
         WHERE m.family_id = ?
       ) members
       LEFT JOIN users u ON u.id = members.user_id
       LEFT JOIN family_points fp
         ON fp.family_id = ?
        AND fp.user_id = members.user_id
       GROUP BY members.user_id, u.nickname, u.real_name, u.avatar_url
       ORDER BY total_points DESC, members.user_id ASC
       LIMIT ? OFFSET ?`,
      [familyId, familyId, pageSize, offset]
    );

    return {
      total: Number((countRows[0] && countRows[0].total) || 0),
      list: Array.isArray(rows) ? rows : [],
    };
  },
};

module.exports = familySpaceModel;
