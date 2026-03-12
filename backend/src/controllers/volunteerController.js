'use strict';

const volunteerService = require('../services/volunteerService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

function sendVolunteerError(res, error, action, defaultMessage) {
  return sendControllerError(res, error, {
    moduleName: 'volunteerController',
    action,
    defaultMessage,
  });
}

async function getProfile(req, res) {
  try {
    const data = await volunteerService.getProfile(req.volunteerScope);
    return ok(res, data, 'success');
  } catch (error) {
    return sendVolunteerError(res, error, 'get_profile_failed', 'Failed to load volunteer profile.');
  }
}

async function getTasks(req, res) {
  try {
    const data = await volunteerService.getTasks(req.volunteerScope, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return sendVolunteerError(res, error, 'get_tasks_failed', 'Failed to load volunteer tasks.');
  }
}

async function acceptTask(req, res) {
  try {
    const data = await volunteerService.acceptTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return sendVolunteerError(res, error, 'accept_task_failed', 'Failed to accept volunteer task.');
  }
}

async function checkInTask(req, res) {
  try {
    const data = await volunteerService.checkInTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return sendVolunteerError(res, error, 'check_in_failed', 'Failed to check in volunteer task.');
  }
}

async function checkOutTask(req, res) {
  try {
    const data = await volunteerService.checkOutTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return sendVolunteerError(res, error, 'check_out_failed', 'Failed to check out volunteer task.');
  }
}

async function completeTask(req, res) {
  try {
    const data = await volunteerService.completeTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'success');
  } catch (error) {
    return sendVolunteerError(res, error, 'complete_task_failed', 'Failed to complete volunteer task.');
  }
}

async function getTraining(req, res) {
  try {
    const data = await volunteerService.getTraining(req.volunteerScope, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return sendVolunteerError(res, error, 'get_training_failed', 'Failed to load volunteer training records.');
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
