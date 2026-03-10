'use strict';

const deviceService = require('../services/deviceService');
const { ok, fail } = require('../utils/response');

/**
 * 统一错误响应
 * @param {object} res
 * @param {Error} err
 */
function mapError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || '服务器内部错误', null, status);
}

const deviceController = {
  /**
   * 绑定设备
   */
  async bind(req, res) {
    try {
      const data = await deviceService.bind(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },

  /**
   * 解绑设备
   */
  async unbind(req, res) {
    try {
      const data = await deviceService.unbind(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },

  /**
   * 设备列表
   */
  async list(req, res) {
    try {
      const data = await deviceService.list(req.user.userId);
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },

  /**
   * 设置主设备
   */
  async setPrimary(req, res) {
    try {
      const data = await deviceService.setPrimary(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },
};

module.exports = deviceController;
