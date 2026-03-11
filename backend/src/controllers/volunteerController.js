'use strict';

const volunteerService = require('../services/volunteerService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

function handleError(error, res, next) {
  if (error && (error.code || error.statusCode)) {
    return sendControllerError(res, error);
  }
  return next(error);
}

async function getProfile(req, res, next) {
  try {
    const data = await volunteerService.getProfile(req.volunteerScope);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getTasks(req, res, next) {
  try {
    const data = await volunteerService.getTasks(req.volunteerScope, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function acceptTask(req, res, next) {
  try {
    const data = await volunteerService.acceptTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function checkInTask(req, res, next) {
  try {
    const data = await volunteerService.checkInTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function checkOutTask(req, res, next) {
  try {
    const data = await volunteerService.checkOutTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function completeTask(req, res, next) {
  try {
    const data = await volunteerService.completeTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getTraining(req, res, next) {
  try {
    const data = await volunteerService.getTraining(req.volunteerScope, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  getProfile,
  getTasks,
  acceptTask,
  checkInTask,
  checkOutTask,
  completeTask,
  getTraining,
};
