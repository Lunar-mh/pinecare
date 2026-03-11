'use strict';

const { ok, fail } = require('../utils/response');
const statisticsService = require('../services/statisticsService');

function handleServiceUnavailable(res) {
  return fail(res, 500, 'Statistics service is temporarily unavailable.', null, 500);
}

const statisticsController = {
  async overview(req, res) {
    try {
      const data = await statisticsService.getOverview();
      return ok(res, data, 'ok');
    } catch (_err) {
      return handleServiceUnavailable(res);
    }
  },

  async activities(req, res) {
    try {
      const data = await statisticsService.getActivities(req.query.limit);
      return ok(res, data, 'ok');
    } catch (_err) {
      return handleServiceUnavailable(res);
    }
  },
};

module.exports = statisticsController;
