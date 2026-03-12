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

async function trigger(req, res) {
  try {
    const data = await sosService.triggerSos(req.user.userId, req.body || {});
    return ok(res, data, 'ok');
  } catch (error) {
    return sendSosError(res, error, 'trigger_failed', 'Failed to trigger SOS event.');
  }
}

async function cancel(req, res) {
  try {
    const data = await sosService.cancelSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'ok');
  } catch (error) {
    return sendSosError(res, error, 'cancel_failed', 'Failed to cancel SOS event.');
  }
}

async function history(req, res) {
  try {
    const data = await sosService.getHistory(req.user.userId, req.query || {});
    return ok(res, data, 'ok');
  } catch (error) {
    return sendSosError(res, error, 'history_failed', 'Failed to load SOS history.');
  }
}

async function confirm(req, res) {
  try {
    const data = await sosService.confirmSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'ok');
  } catch (error) {
    return sendSosError(res, error, 'confirm_failed', 'Failed to confirm SOS event.');
  }
}

async function resolve(req, res) {
  try {
    const data = await sosService.resolveSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'ok');
  } catch (error) {
    return sendSosError(res, error, 'resolve_failed', 'Failed to resolve SOS event.');
  }
}

module.exports = {
  trigger,
  cancel,
  history,
  confirm,
  resolve,
};
