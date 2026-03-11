'use strict';

const { ok, fail } = require('../utils/response');
const locationService = require('../services/locationService');
const locationTrailService = require('../services/locationTrailService');

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

const locationController = {
  async upload(req, res) {
    try {
      const data = await locationService.upload(req.user.userId, {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        accuracy: req.body.accuracy,
        locationType: req.body.locationType,
      });
      return ok(res, data, 'Upload successful.');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async current(req, res) {
    try {
      const data = await locationService.getCurrent(req.user.userId);
      return ok(res, data, 'Query successful.');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async trail(req, res) {
    try {
      const data = await locationTrailService.getTrail(req.user.userId, {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit,
      });
      return ok(res, data, 'Query successful.');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = locationController;
