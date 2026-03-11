'use strict';

const { query } = require('../config/database');

function unwrap(result) {
  return Array.isArray(result) ? result[0] : result;
}

async function execute(sql, params) {
  return unwrap(await query(sql, params));
}

function parsePoints(points) {
  if (!points) {
    return [];
  }
  if (Array.isArray(points)) {
    return points;
  }
  try {
    return JSON.parse(points);
  } catch (error) {
    return [];
  }
}

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    fenceType: row.fence_type,
    centerLat: row.center_lat !== null ? Number(row.center_lat) : null,
    centerLng: row.center_lng !== null ? Number(row.center_lng) : null,
    radius: row.radius !== null ? Number(row.radius) : null,
    points: parsePoints(row.points),
    alertType: row.alert_type,
    isActive: Number(row.is_active) === 1,
    createdAt: row.created_at,
  };
}

const geoFenceModel = {
  async create(payload) {
    const result = await execute(
      `INSERT INTO geo_fences
       (user_id, name, fence_type, center_lat, center_lng, radius, points, alert_type, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.userId,
        payload.name,
        payload.fenceType,
        payload.centerLat !== undefined ? payload.centerLat : null,
        payload.centerLng !== undefined ? payload.centerLng : null,
        payload.radius !== undefined ? payload.radius : null,
        payload.points ? JSON.stringify(payload.points) : null,
        payload.alertType || 'both',
        payload.isActive === false ? 0 : 1,
      ]
    );

    return this.findByIdAndUserId(result.insertId, payload.userId);
  },

  async findByIdAndUserId(id, userId) {
    const rows = await execute(
      `SELECT id, user_id, name, fence_type, center_lat, center_lng, radius, points, alert_type, is_active, created_at
       FROM geo_fences
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRow(rows[0]);
  },

  async updateByIdAndUserId(id, userId, patch = {}) {
    const fields = [];
    const params = [];

    if (patch.name !== undefined) {
      fields.push('name = ?');
      params.push(patch.name);
    }

    if (patch.fenceType !== undefined) {
      fields.push('fence_type = ?');
      params.push(patch.fenceType);
    }

    if (patch.centerLat !== undefined) {
      fields.push('center_lat = ?');
      params.push(patch.centerLat);
    }

    if (patch.centerLng !== undefined) {
      fields.push('center_lng = ?');
      params.push(patch.centerLng);
    }

    if (patch.radius !== undefined) {
      fields.push('radius = ?');
      params.push(patch.radius);
    }

    if (patch.points !== undefined) {
      fields.push('points = ?');
      params.push(patch.points ? JSON.stringify(patch.points) : null);
    }

    if (patch.alertType !== undefined) {
      fields.push('alert_type = ?');
      params.push(patch.alertType);
    }

    if (patch.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(patch.isActive ? 1 : 0);
    }

    if (fields.length === 0) {
      return this.findByIdAndUserId(id, userId);
    }

    params.push(id, userId);
    const result = await execute(
      `UPDATE geo_fences
       SET ${fields.join(', ')}
       WHERE id = ? AND user_id = ?`,
      params
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.findByIdAndUserId(id, userId);
  },

  async deleteByIdAndUserId(id, userId) {
    const result = await execute(
      `DELETE FROM geo_fences
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    return result.affectedRows;
  },

  async toggleByIdAndUserId(id, userId, isActive) {
    const result = await execute(
      `UPDATE geo_fences
       SET is_active = ?
       WHERE id = ? AND user_id = ?`,
      [isActive ? 1 : 0, id, userId]
    );

    if (!result.affectedRows) {
      return null;
    }

    return this.findByIdAndUserId(id, userId);
  },

  async listByUserId(userId) {
    const rows = await execute(
      `SELECT id, user_id, name, fence_type, center_lat, center_lng, radius, points, alert_type, is_active, created_at
       FROM geo_fences
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },

  async getActiveByUserId(userId) {
    const rows = await execute(
      `SELECT id, user_id, name, fence_type, center_lat, center_lng, radius, points, alert_type, is_active, created_at
       FROM geo_fences
       WHERE user_id = ? AND is_active = 1
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return Array.isArray(rows) ? rows.map(mapRow) : [];
  },
};

module.exports = geoFenceModel;
