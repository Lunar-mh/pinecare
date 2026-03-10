'use strict';

const { ok, fail } = require('../utils/response');
const fenceService = require('../services/fenceService');

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

const fenceController = {
  /**
   * 查询围栏列表
   * @param {object} req
   * @param {object} res
   * @returns {Promise<object>}
   */
  async list(req, res) {
    try {
      const data = await fenceService.list(req.user.userId);
      return ok(res, data, '查询成功');
    } catch (err) {
      return handleError(res, err);
    }
  },

  /**
   * 创建围栏
   * @param {object} req
   * @param {object} res
   * @returns {Promise<object>}
   */
  async create(req, res) {
    try {
      const data = await fenceService.create(req.user.userId, req.body || {});
      return ok(res, data, '创建成功');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = fenceController;
