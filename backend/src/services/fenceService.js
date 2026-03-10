'use strict';

const geoFenceModel = require('../models/geoFenceModel');

const VALID_FENCE_TYPES = ['circle', 'polygon'];
const VALID_ALERT_TYPES = ['enter', 'exit', 'both'];

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function ensureLatLng(lat, lng) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw createBizError(400, 'latitude is out of range.', 400);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw createBizError(400, 'longitude is out of range.', 400);
  }
}

function validateFencePayload(payload, isPartial = false) {
  const fenceType = payload && payload.fenceType ? String(payload.fenceType) : null;
  const name = payload && payload.name ? String(payload.name).trim() : null;
  const alertType = payload && payload.alertType ? String(payload.alertType) : null;

  if (!isPartial || name !== null) {
    if (!name) {
      throw createBizError(400, 'name is required.', 400);
    }
  }

  if (fenceType !== null && !VALID_FENCE_TYPES.includes(fenceType)) {
    throw createBizError(400, 'fenceType must be circle/polygon.', 400);
  }

  if (alertType !== null && !VALID_ALERT_TYPES.includes(alertType)) {
    throw createBizError(400, 'alertType must be enter/exit/both.', 400);
  }

  const effectiveFenceType = fenceType || payload.currentFenceType;

  if (effectiveFenceType === 'circle') {
    const centerLat = payload.centerLat !== undefined ? Number(payload.centerLat) : undefined;
    const centerLng = payload.centerLng !== undefined ? Number(payload.centerLng) : undefined;
    const radius = payload.radius !== undefined ? Number(payload.radius) : undefined;

    if (
      centerLat !== undefined ||
      centerLng !== undefined ||
      radius !== undefined ||
      (!isPartial && effectiveFenceType === 'circle')
    ) {
      ensureLatLng(Number(centerLat), Number(centerLng));
      if (!Number.isFinite(radius) || radius <= 0) {
        throw createBizError(400, 'radius must be a positive number.', 400);
      }
    }
  }

  if (effectiveFenceType === 'polygon' && payload.points !== undefined) {
    const points = Array.isArray(payload.points) ? payload.points : [];
    if (points.length < 3) {
      throw createBizError(400, 'polygon points must be at least 3.', 400);
    }

    points.forEach((item) => {
      ensureLatLng(Number(item.lat), Number(item.lng));
    });
  }
}

const fenceService = {
  async list(userId) {
    return geoFenceModel.listByUserId(userId);
  },

  async create(userId, payload) {
    const body = payload || {};
    validateFencePayload(body, false);

    const fenceType = String(body.fenceType);

    if (fenceType === 'circle') {
      return geoFenceModel.create({
        userId,
        name: String(body.name).trim(),
        fenceType,
        centerLat: Number(body.centerLat),
        centerLng: Number(body.centerLng),
        radius: Math.floor(Number(body.radius)),
        alertType: body.alertType || 'both',
        isActive: body.isActive !== false,
      });
    }

    const points = Array.isArray(body.points)
      ? body.points.map((item) => ({ lat: Number(item.lat), lng: Number(item.lng) }))
      : [];

    return geoFenceModel.create({
      userId,
      name: String(body.name).trim(),
      fenceType,
      points,
      alertType: body.alertType || 'both',
      isActive: body.isActive !== false,
    });
  },

  async update(userId, fenceId, payload) {
    const existing = await geoFenceModel.findByIdAndUserId(fenceId, userId);
    if (!existing) {
      throw createBizError(404, 'Fence not found.', 404);
    }

    const patch = {
      name: payload.name,
      fenceType: payload.fenceType,
      centerLat: payload.centerLat,
      centerLng: payload.centerLng,
      radius: payload.radius,
      points: payload.points,
      alertType: payload.alertType,
      isActive: payload.isActive,
      currentFenceType: existing.fenceType,
    };

    validateFencePayload(patch, true);

    const updated = await geoFenceModel.updateByIdAndUserId(fenceId, userId, {
      name: payload.name !== undefined ? String(payload.name).trim() : undefined,
      fenceType: payload.fenceType,
      centerLat: payload.centerLat !== undefined ? Number(payload.centerLat) : undefined,
      centerLng: payload.centerLng !== undefined ? Number(payload.centerLng) : undefined,
      radius: payload.radius !== undefined ? Number(payload.radius) : undefined,
      points:
        payload.points !== undefined
          ? Array.isArray(payload.points)
            ? payload.points.map((item) => ({ lat: Number(item.lat), lng: Number(item.lng) }))
            : []
          : undefined,
      alertType: payload.alertType,
      isActive: payload.isActive,
    });

    if (!updated) {
      throw createBizError(500, 'Failed to update fence.', 500);
    }

    return updated;
  },

  async remove(userId, fenceId) {
    const affectedRows = await geoFenceModel.deleteByIdAndUserId(fenceId, userId);
    if (!affectedRows) {
      throw createBizError(404, 'Fence not found.', 404);
    }

    return null;
  },

  async toggle(userId, fenceId, isActive) {
    const updated = await geoFenceModel.toggleByIdAndUserId(fenceId, userId, Boolean(isActive));
    if (!updated) {
      throw createBizError(404, 'Fence not found.', 404);
    }

    return updated;
  },
};

module.exports = fenceService;
