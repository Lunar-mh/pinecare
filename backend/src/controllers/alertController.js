'use strict';

const { ok, fail } = require('../utils/response');
const alertService = require('../services/alertService');

/**
 * 统一错误映射
 * @param {object} res
 * @param {Error} err
 * @returns {object}
 */
function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, '服务器内部错误', null, 500);
}

const alertController = {
  /**
   * 查询告警列表
   * @param {object} req
   * @param {object} res
   * @returns {Promise<object>}
   */
  async list(req, res) {
    try {
      const data = await alertService.listAlerts(req.user.userId, {
        isHandled: req.query.isHandled,
      });
      return ok(res, data, '查询成功');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = alertController;
