'use strict';

const locationRecordModel = require('../models/locationRecordModel');
const geoFenceModel = require('../models/geoFenceModel');
const fenceAlertModel = require('../models/fenceAlertModel');
const locationCacheService = require('./locationCacheService');
const { recordCareEvent } = require('./eventTimelineService');
const { checkFenceViolation, isInsideFence } = require('../utils/geoFenceMath');
const { createBizError } = require('../utils/serviceError');

const VALID_LOCATION_TYPES = ['gps', 'wifi', 'smart_band', 'cell_tower'];


function normalizeLocationPayload(payload) {
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const accuracy = payload.accuracy !== undefined ? Number(payload.accuracy) : null;
  const locationType = payload.locationType ? String(payload.locationType) : 'gps';

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw createBizError(400, 'latitude is invalid.', 400);
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw createBizError(400, 'longitude is invalid.', 400);
  }

  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
    throw createBizError(400, 'accuracy is invalid.', 400);
  }

  if (!VALID_LOCATION_TYPES.includes(locationType)) {
    throw createBizError(400, 'locationType must be one of gps/wifi/smart_band.', 400);
  }

  return {
    latitude,
    longitude,
    accuracy,
    locationType,
  };
}

async function handleFenceAlerts(userId, location, previousLocation) {
  const activeFences = await geoFenceModel.getActiveByUserId(userId);

  if (!Array.isArray(activeFences) || activeFences.length === 0 || !previousLocation) {
    return [];
  }

  const alerts = [];
  for (const fence of activeFences) {
    const previousInside = isInsideFence(previousLocation, fence);
    const result = checkFenceViolation(location, {
      ...fence,
      lastInside: previousInside,
    });

    if (result.violated && result.alertType) {
      const alert = await fenceAlertModel.create({
        fenceId: fence.id,
        userId,
        alertType: result.alertType,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

const locationService = {
  async upload(userId, payload) {
    const normalized = normalizeLocationPayload(payload || {});

    let previousLocation = null;
    try {
      previousLocation = await locationCacheService.getCurrentLocation(userId);
    } catch (_error) {
      previousLocation = await locationRecordModel.getLatest(userId);
    }

    const record = await locationRecordModel.insert({
      userId,
      ...normalized,
    });

    const currentLocation = {
      userId,
      latitude: record.latitude,
      longitude: record.longitude,
      accuracy: record.accuracy,
      locationType: record.locationType,
      createdAt: record.createdAt,
    };

    try {
      await locationCacheService.setCurrentLocation(userId, currentLocation);
    } catch (_error) {
      // 缓存写入尽力而为
    }

    const alerts = await handleFenceAlerts(userId, currentLocation, previousLocation);

    await recordCareEvent('location.upload', {
      userId,
      entityType: 'location',
      entityId: record.id,
      status: 'uploaded',
      occurredAt: record.createdAt,
      details: {
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy: record.accuracy,
        locationType: record.locationType,
        alertsTriggered: alerts.length,
        alertIds: alerts.map((item) => item.id).filter(Boolean),
      },
    });

    return {
      location: currentLocation,
      alerts,
    };
  },

  async getCurrent(userId) {
    try {
      const cached = await locationCacheService.getCurrentLocation(userId);
      if (cached) {
        return cached;
      }
    } catch (_error) {
      // 缓存读取尽力而为
    }

    const latest = await locationRecordModel.getLatest(userId);
    if (!latest) {
      return null;
    }

    const currentLocation = {
      userId,
      latitude: latest.latitude,
      longitude: latest.longitude,
      accuracy: latest.accuracy,
      locationType: latest.locationType,
      createdAt: latest.createdAt,
    };

    try {
      await locationCacheService.setCurrentLocation(userId, currentLocation);
    } catch (_error) {
      // cache write is best-effort
    }

    return currentLocation;
  },
};

module.exports = locationService;

