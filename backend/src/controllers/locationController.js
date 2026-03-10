'use strict';

const { ok, fail } = require('../utils/response');
const locationService = require('../services/locationService');
const locationTrailService = require('../services/locationTrailService');

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

const locationController = {
  /**
   * 上传当前位置
   * @param {object} req
   * @param {object} res
   * @returns {Promise<object>}
   */
  async upload(req, res) {
    try {
      const data = await locationService.upload(req.user.userId, {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        accuracy: req.body.accuracy,
        locationType: req.body.locationType,
      });
      return ok(res, data, '上传成功');
    } catch (err) {
      return handleError(res, err);
    }
  },

  /**
   * 获取当前位置
   * @param {object} req
   * @param {object} res
   * @returns {Promise<object>}
   */
  async current(req, res) {
    try {
      const data = await locationService.getCurrent(req.user.userId);
      return ok(res, data, '查询成功');
    } catch (err) {
      return handleError(res, err);
    }
  },

  /**
   * 获取轨迹
   * @param {object} req
   * @param {object} res
   * @returns {Promise<object>}
   */
  async trail(req, res) {
    try {
      const data = await locationTrailService.getTrail(req.user.userId, {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit,
      });
      return ok(res, data, '查询成功');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = locationController;
