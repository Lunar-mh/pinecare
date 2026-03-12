'use strict';

const medicationLogService = require('../services/medicationLogService');
const medicationConfirmService = require('../services/medicationConfirmService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || '用药记录服务暂时不可用，请稍后重试。', err.data || null, status);
}

const medicationLogController = {
  async today(req, res) {
    try {
      const data = await medicationLogService.getTodaySchedule(
        req.user.userId,
        req.query && req.query.date
      );
      return ok(res, data, '今日用药日程获取成功。');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async list(req, res) {
    try {
      const data = await medicationLogService.getLogs(req.user.userId, req.query || {});
      return ok(res, data, '用药记录获取成功。');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async confirm(req, res) {
    try {
      const data = await medicationConfirmService.confirm(req.user.userId, req.body || {});

      if (data.idempotent) {
        return ok(res, data, '本次用药记录已确认，无需重复提交。');
      }

      return ok(res, data, '用药确认成功。');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = medicationLogController;