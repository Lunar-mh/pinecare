'use strict';

const fallService = require('../services/fallService');
const { ok, fail } = require('../utils/response');

/**
 * 统一错误映射
 * @param {object} res
 * @param {Error} err
 */
function mapError(res, err) {
  const code =
    typeof err.code === 'number'
      ? err.code
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : code;
  const message = err.message || '服务器内部错误';
  return fail(res, code, message, null, status);
}

/**
 * POST /fall-detection/report
 */
async function report(req, res) {
  try {
    const userId = req.user.userId;
    const sensorData = req.body && req.body.sensorData ? req.body.sensorData : req.body;

    if (!sensorData || typeof sensorData !== 'object') {
      return fail(res, 400, 'sensorData 必须为对象', null, 400);
    }

    const data = await fallService.reportFall(userId, sensorData);
    return ok(res, data, 'success');
  } catch (err) {
    return mapError(res, err);
  }
}

/**
 * POST /fall-detection/cancel
 */
async function cancel(req, res) {
  try {
    const userId = req.user.userId;
    const eventId = req.body ? req.body.eventId : null;
    if (!eventId) {
      return fail(res, 400, 'eventId 不能为空', null, 400);
    }

    const data = await fallService.cancelFall(userId, eventId);
    return ok(res, data, 'success');
  } catch (err) {
    return mapError(res, err);
  }
}

/**
 * GET /fall-detection/history
 */
async function history(req, res) {
  try {
    const userId = req.user.userId;
    const data = await fallService.getFallHistory(userId, {
      page: req.query.page,
      pageSize: req.query.pageSize,
      status: req.query.status,
    });

    return ok(res, data, 'success');
  } catch (err) {
    return mapError(res, err);
  }
}

/**
 * GET /fall-detection/settings
 */
async function getSettings(req, res) {
  try {
    const userId = req.user.userId;
    const data = await fallService.getFallSettings(userId);
    return ok(res, data, 'success');
  } catch (err) {
    return mapError(res, err);
  }
}

/**
 * PUT /fall-detection/settings
 */
async function updateSettings(req, res) {
  try {
    const userId = req.user.userId;
    const sensitivity = req.body ? req.body.sensitivity : null;
    if (!sensitivity) {
      return fail(res, 400, 'sensitivity 不能为空', null, 400);
    }

    const data = await fallService.updateFallSettings(userId, sensitivity);
    return ok(res, data, 'success');
  } catch (err) {
    return mapError(res, err);
  }
}

module.exports = {
  report,
  cancel,
  history,
  getSettings,
  updateSettings,
};
