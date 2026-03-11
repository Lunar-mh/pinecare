'use strict';

const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');
const statisticsService = require('../services/statisticsService');

function handleError(res, err) {
  return sendControllerError(res, err, {
    defaultMessage: 'Statistics service is temporarily unavailable.',
  });
}

const statisticsController = {
  async overview(req, res) {
    try {
      const data = await statisticsService.getOverview();
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async activities(req, res) {
    try {
      const data = await statisticsService.getActivities(req.query.limit);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = statisticsController;
