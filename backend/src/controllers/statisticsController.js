'use strict';

const { ok, fail } = require('../utils/response');
const statisticsService = require('../services/statisticsService');

function ensureAdmin(req, res) {
  if (req.user && (req.user.isAdmin === true || req.user.role === 'admin')) {
    return true;
  }
  fail(res, 403, '无权限访问', null, 403);
  return false;
}

const statisticsController = {
  async overview(req, res) {
    if (!ensureAdmin(req, res)) return;
    try {
      const data = await statisticsService.getOverview();
      return ok(res, data, 'ok');
    } catch (_err) {
      return fail(res, 500, '统计服务暂时不可用', null, 500);
    }
  },

  async activities(req, res) {
    if (!ensureAdmin(req, res)) return;
    try {
      const data = await statisticsService.getActivities(req.query.limit);
      return ok(res, data, 'ok');
    } catch (_err) {
      return fail(res, 500, '统计服务暂时不可用', null, 500);
    }
  },
};

module.exports = statisticsController;
