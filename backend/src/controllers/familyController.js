'use strict';

const familyService = require('../services/familyService');
const { ok, fail } = require('../utils/response');

/**
 * 统一处理业务错误
 * @param {Error} error
 * @param {object} res
 * @param {function} next
 * @returns {any}
 */
function handleBusinessError(error, res, next) {
  if (error && error.statusCode) {
    return fail(
      res,
      error.code || error.statusCode,
      error.message || '请求失败',
      error.data || null,
      error.statusCode
    );
  }

  return next(error);
}

/**
 * GET /family/bindings
 */
async function getBindings(req, res, next) {
  try {
    const data = await familyService.getFamilyBindings(req.user.userId);
    return ok(res, data, '成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * GET /family/elderly-overview
 */
async function getElderlyOverview(req, res, next) {
  try {
    const data = await familyService.getElderlyOverview(req.user.userId);
    return ok(res, data, '成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * GET /family/health/:elderId
 */
async function getHealthByElderId(req, res, next) {
  try {
    const data = await familyService.getElderHealth(req.user.userId, req.params.elderId);
    return ok(res, data, '成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * GET /family/settings
 */
async function getSettings(req, res, next) {
  try {
    const data = await familyService.getNotificationSettings(req.user.userId);
    return ok(res, data, '成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * PUT /family/settings
 */
async function updateSettings(req, res, next) {
  try {
    const data = await familyService.updateNotificationSettings(req.user.userId, req.body);
    return ok(res, data, '成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

module.exports = {
  getBindings,
  getElderlyOverview,
  getHealthByElderId,
  getSettings,
  updateSettings,
};
