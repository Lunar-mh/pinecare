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
    return ok(res, data, 'SOS event created.');
  } catch (error) {
    return sendSosError(res, error, 'trigger_failed', 'Failed to trigger SOS event.');
  }
}

async function cancel(req, res) {
  try {
    const data = await sosService.cancelSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'SOS event cancelled.');
  } catch (error) {
    return sendSosError(res, error, 'cancel_failed', 'Failed to cancel SOS event.');
  }
}

async function history(req, res) {
  try {
    const data = await sosService.getHistory(req.user.userId, req.query || {});
    return ok(res, data, 'SOS history loaded.');
  } catch (error) {
    return sendSosError(res, error, 'history_failed', 'Failed to load SOS history.');
  }
}

async function detail(req, res) {
  try {
    const data = await sosService.getEventById(req.user.userId, req.params.eventId);
    return ok(res, data, 'SOS event loaded.');
  } catch (error) {
    return sendSosError(res, error, 'detail_failed', 'Failed to load SOS event.');
  }
}

async function confirm(req, res) {
  try {
    const data = await sosService.confirmSos(req.user.userId, req.body.event_id);
    return ok(res, data, 'SOS event confirmed.');
  } catch (error) {
    return sendSosError(res, error, 'confirm_failed', 'Failed to confirm SOS event.');
  }
}

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
