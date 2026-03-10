'use strict';

const medicationLogService = require('../services/medicationLogService');
const medicationConfirmService = require('../services/medicationConfirmService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || '服务器内部错误', err.data || null, status);
}

const medicationLogController = {
  async list(req, res) {
    try {
      const data = await medicationLogService.getLogs(req.user.userId, req.query || {});
      return ok(res, data, '获取服药记录成功');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async confirm(req, res) {
    try {
      const data = await medicationConfirmService.confirm(req.user.userId, req.body || {});

      if (data.idempotent) {
        return ok(res, data, '该记录已确认，无需重复操作');
      }

      return ok(res, data, '服药确认成功');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = medicationLogController;
