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

async function getBindings(req, res, next) {
  try {
    const data = await familyService.getFamilyBindings(req.user.userId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function getElderlyOverview(req, res, next) {
  try {
    const data = await familyService.getElderlyOverview(req.user.userId, req.query || {});
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function getHealthByElderId(req, res, next) {
  try {
    const data = await familyService.getElderHealth(req.user.userId, req.params.elderId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function getSettings(req, res, next) {
  try {
    const data = await familyService.getNotificationSettings(req.user.userId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

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
