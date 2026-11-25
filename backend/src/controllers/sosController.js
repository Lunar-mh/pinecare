'use strict';

const sosService = require('../services/sosService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

function sendSosError(res, error, action, defaultMessage) {
  return sendControllerError(res, error, {
    moduleName: 'sosController',
    action,
    defaultMessage,
  });
}

/**
 * @description 触发 SOS 一键紧急呼救控制器
 * @param {import('express').Request} req HTTP 请求对象，需提供 body.latitude, body.longitude, body.address
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 返回求救事件ID与 triggered 状态
 */
async function trigger(req, res) {
  try {
    const data = await sosService.triggerSos(req.user.userId, req.body || {});
    return ok(res, data, 'SOS event created.');
  } catch (error) {
    return sendSosError(res, error, 'trigger_failed', 'Failed to trigger SOS event.');
  }
}

/**
 * @description 取消 SOS 呼救控制器（5秒内防误触快速取消）
 * @param {import('express').Request} req HTTP 请求对象，需提供 body.event_id
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 返回取消后的事件状态
 */
async function cancel(req, res) {
  try {
    const data = await sosService.cancelSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'SOS event cancelled.');
  } catch (error) {
    return sendSosError(res, error, 'cancel_failed', 'Failed to cancel SOS event.');
  }
}

/**
 * @description 查询 SOS 呼救历史记录与分页明细
 * @param {import('express').Request} req HTTP 请求对象，支持 query.page 与 query.page_size
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 历史呼救列表与分页信息
 */
async function history(req, res) {
  try {
    const data = await sosService.getHistory(req.user.userId, req.query || {});
    return ok(res, data, 'SOS history loaded.');
  } catch (error) {
    return sendSosError(res, error, 'history_failed', 'Failed to load SOS history.');
  }
}

/**
 * @description 查询单条 SOS 警情事件详情与多渠道触达状态
 * @param {import('express').Request} req HTTP 请求对象，params.eventId 事件ID
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function detail(req, res) {
  try {
    const data = await sosService.getEventById(req.user.userId, req.params.eventId);
    return ok(res, data, 'SOS event loaded.');
  } catch (error) {
    return sendSosError(res, error, 'detail_failed', 'Failed to load SOS event.');
  }
}

/**
 * @description 确认警情正在处置控制器
 * @param {import('express').Request} req HTTP 请求对象，需提供 body.event_id
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function confirm(req, res) {
  try {
    const data = await sosService.confirmSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'SOS event confirmed.');
  } catch (error) {
    return sendSosError(res, error, 'confirm_failed', 'Failed to confirm SOS event.');
  }
}

/**
 * @description 结案归档 SOS 呼救控制器
 * @param {import('express').Request} req HTTP 请求对象，需提供 body.event_id
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function resolve(req, res) {
  try {
    const data = await sosService.resolveSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'SOS event resolved.');
  } catch (error) {
    return sendSosError(res, error, 'resolve_failed', 'Failed to resolve SOS event.');
  }
}

module.exports = {
  trigger,
  cancel,
  history,
  detail,
  confirm,
  resolve,
};
