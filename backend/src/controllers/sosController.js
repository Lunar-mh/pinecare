'use strict';

const sosService = require('../services/sosService');
const { ok, fail } = require('../utils/response');

function mapError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const statusCode =
    typeof err.statusCode === 'number' ? err.statusCode : code >= 400 && code < 600 ? code : 500;
  const message = err.message || 'Internal server error.';
  const data = err.data || null;
  return fail(res, code, message, data, statusCode);
}

async function trigger(req, res) {
  try {
    const data = await sosService.triggerSos(req.user.userId, req.body || {});
    return ok(res, data, 'ok');
  } catch (err) {
    return mapError(res, err);
  }
}

async function cancel(req, res) {
  try {
    const data = await sosService.cancelSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'ok');
  } catch (err) {
    return mapError(res, err);
  }
}

async function history(req, res) {
  try {
    const data = await sosService.getHistory(req.user.userId, req.query || {});
    return ok(res, data, 'ok');
  } catch (err) {
    return mapError(res, err);
  }
}

async function confirm(req, res) {
  try {
    const data = await sosService.confirmSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'ok');
  } catch (err) {
    return mapError(res, err);
  }
}

async function resolve(req, res) {
  try {
    const data = await sosService.resolveSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'ok');
  } catch (err) {
    return mapError(res, err);
  }
}

module.exports = {
  trigger,
  cancel,
  history,
  confirm,
  resolve,
};
