'use strict';

const familyService = require('../services/familyService');
const { ok, fail } = require('../utils/response');

function handleBusinessError(error, res, next) {
  if (error && error.statusCode) {
    return fail(
      res,
      error.code || error.statusCode,
      error.message || 'Request failed.',
      error.data || null,
      error.statusCode
    );
  }

  return next(error);
}

/**
 * @description 获取当前家属账号已绑定的长辈账号列表
 * @param {import('express').Request} req HTTP 请求对象
 * @param {import('express').Response} res HTTP 响应对象
 * @param {import('express').NextFunction} next 下一个中间件
 * @returns {Promise<void>}
 */
async function getBindings(req, res, next) {
  try {
    const data = await familyService.getFamilyBindings(req.user.userId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * @description 家属端长辈一屏统览核心看板（体征、服药、定位、警情与互动证据）
 * @param {import('express').Request} req HTTP 请求对象，支持 query.elder_id 指定目标长辈
 * @param {import('express').Response} res HTTP 响应对象
 * @param {import('express').NextFunction} next 下一个中间件
 * @returns {Promise<void>} 冻结的 elderly-overview 契约聚合体
 */
async function getElderlyOverview(req, res, next) {
  try {
    const data = await familyService.getElderlyOverview(req.user.userId, req.query || {});
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * @description 根据长辈ID查询其今日健康测量概览
 * @param {import('express').Request} req HTTP 请求对象，params.elderId 长辈ID
 * @param {import('express').Response} res HTTP 响应对象
 * @param {import('express').NextFunction} next 下一个中间件
 * @returns {Promise<void>}
 */
async function getHealthByElderId(req, res, next) {
  try {
    const data = await familyService.getElderHealth(req.user.userId, req.params.elderId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * @description 获取家属预警通知配置（健康异常、用药提醒、SOS联动）
 * @param {import('express').Request} req HTTP 请求对象
 * @param {import('express').Response} res HTTP 响应对象
 * @param {import('express').NextFunction} next 下一个中间件
 * @returns {Promise<void>}
 */
async function getSettings(req, res, next) {
  try {
    const data = await familyService.getNotificationSettings(req.user.userId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

/**
 * @description 更新家属端消息通知配置
 * @param {import('express').Request} req HTTP 请求对象，需提供各通知开关联动项
 * @param {import('express').Response} res HTTP 响应对象
 * @param {import('express').NextFunction} next 下一个中间件
 * @returns {Promise<void>}
 */
async function updateSettings(req, res, next) {
  try {
    const data = await familyService.updateNotificationSettings(req.user.userId, req.body);
    return ok(res, data, 'success');
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
