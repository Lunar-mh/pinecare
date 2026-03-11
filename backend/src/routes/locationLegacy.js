'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const locationService = require('../services/locationService');
const locationTrailService = require('../services/locationTrailService');
const fenceService = require('../services/fenceService');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();
router.use(deprecatedRoute('/gps'));

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

router.post('/update', auth, async (req, res) => {
  try {
    const data = await locationService.upload(req.user.userId, req.body || {});
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/current', auth, async (req, res) => {
  try {
    const data = await locationService.getCurrent(req.user.userId);
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/family', auth, async (req, res) => {
  try {
    const now = new Date();
    const endDate = req.query.endDate || now.toISOString();
    const startDate =
      req.query.startDate || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const data = await locationTrailService.getTrail(req.user.userId, {
      startDate,
      endDate,
      limit: req.query.limit || 200,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/safe-zones', auth, async (req, res) => {
  try {
    const data = await fenceService.list(req.user.userId);
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/safe-zones', auth, async (req, res) => {
  try {
    const data = await fenceService.create(req.user.userId, {
      name: req.body.name,
      fenceType: req.body.fenceType || req.body.type || 'circle',
      centerLat: req.body.centerLat || req.body.latitude,
      centerLng: req.body.centerLng || req.body.longitude,
      radius: req.body.radius,
      points: req.body.points,
      alertType: req.body.alertType || 'both',
      isActive: req.body.isActive,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/safe-zones/:id', auth, async (req, res) => {
  try {
    const fenceId = parsePositiveInt(req.params.id);
    if (!fenceId) {
      return fail(res, 400, 'Invalid fence id.', null, 400);
    }

    const data = await fenceService.update(req.user.userId, fenceId, {
      name: req.body.name,
      fenceType: req.body.fenceType || req.body.type,
      centerLat: req.body.centerLat || req.body.latitude,
      centerLng: req.body.centerLng || req.body.longitude,
      radius: req.body.radius,
      points: req.body.points,
      alertType: req.body.alertType,
      isActive: req.body.isActive,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/safe-zones/:id/delete', auth, async (req, res) => {
  try {
    const fenceId = parsePositiveInt(req.params.id);
    if (!fenceId) {
      return fail(res, 400, 'Invalid fence id.', null, 400);
    }

    await fenceService.remove(req.user.userId, fenceId);
    return ok(res, null, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/safe-zones/:id/toggle', auth, async (req, res) => {
  try {
    const fenceId = parsePositiveInt(req.params.id);
    if (!fenceId) {
      return fail(res, 400, 'Invalid fence id.', null, 400);
    }

    const data = await fenceService.toggle(req.user.userId, fenceId, req.body && req.body.isActive);
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
});

module.exports = router;
