'use strict';

const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');
const locationService = require('../services/locationService');
const locationTrailService = require('../services/locationTrailService');

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
      return sendControllerError(res, err, {
        action: 'upload_failed',
        defaultMessage: 'Location upload failed.',
        moduleName: 'locationController',
      });
    }
  },

  async current(req, res) {
    try {
      const data = await locationService.getCurrent(req.user.userId);
      return ok(res, data, 'Query successful.');
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'current_failed',
        defaultMessage: 'Location query failed.',
        moduleName: 'locationController',
      });
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
      return sendControllerError(res, err, {
        action: 'trail_failed',
        defaultMessage: 'Trail query failed.',
        moduleName: 'locationController',
      });
    }
  },
};

module.exports = locationController;
