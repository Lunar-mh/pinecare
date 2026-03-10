'use strict';

const medicationHistoryService = require('../services/medicationHistoryService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || '服务器内部错误', err.data || null, status);
}

const medicationHistoryController = {
  async calendar(req, res) {
    try {
      const month = String((req.query && req.query.month) || '').trim();
      const data = await medicationHistoryService.getCalendar(req.user.userId, month);
      return ok(res, data, '获取用药历史日历成功');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = medicationHistoryController;
