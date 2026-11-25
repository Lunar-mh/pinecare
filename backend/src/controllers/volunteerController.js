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

/**
 * @description 获取志愿者个人主页档案信息（含累计服务工时与工单统计）
 * @param {import('express').Request} req HTTP 请求对象，需携带 req.volunteerScope
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function getProfile(req, res) {
  try {
    const data = await volunteerService.getProfile(req.volunteerScope);
    return ok(res, data, 'Volunteer profile loaded.');
  } catch (error) {
    return sendVolunteerError(res, error, 'get_profile_failed', 'Failed to load volunteer profile.');
  }
}

/**
 * @description 查询志愿者工单列表与工单状态总览
 * @param {import('express').Request} req HTTP 请求对象，支持 query.status 与 query.keyword
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function getTasks(req, res) {
  try {
    const data = await volunteerService.getTasks(req.volunteerScope, req.query);
    return ok(res, data, 'Volunteer tasks loaded.');
  } catch (error) {
    return sendVolunteerError(res, error, 'get_tasks_failed', 'Failed to load volunteer tasks.');
  }
}

/**
 * @description 志愿者认领接单控制器
 * @param {import('express').Request} req HTTP 请求对象，params.taskId 工单ID
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function acceptTask(req, res) {
  try {
    const data = await volunteerService.acceptTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'Volunteer task accepted.');
  } catch (error) {
    return sendVolunteerError(res, error, 'accept_task_failed', 'Failed to accept volunteer task.');
  }
}

/**
 * @description 志愿者上门到达签到控制器
 * @param {import('express').Request} req HTTP 请求对象，params.taskId 工单ID
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function checkInTask(req, res) {
  try {
    const data = await volunteerService.checkInTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'Volunteer task checked in.');
  } catch (error) {
    return sendVolunteerError(res, error, 'check_in_failed', 'Failed to check in volunteer task.');
  }
}

/**
 * @description 志愿者服务结束上门签退控制器
 * @param {import('express').Request} req HTTP 请求对象，params.taskId 工单ID
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function checkOutTask(req, res) {
  try {
    const data = await volunteerService.checkOutTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'Volunteer task checked out.');
  } catch (error) {
    return sendVolunteerError(res, error, 'check_out_failed', 'Failed to check out volunteer task.');
  }
}

/**
 * @description 志愿者工单结案并完成服务工时结算归档
 * @param {import('express').Request} req HTTP 请求对象，params.taskId 工单ID
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function completeTask(req, res) {
  try {
    const data = await volunteerService.completeTask(req.volunteerScope, req.params.taskId);
    return ok(res, data, 'Volunteer task completed.');
  } catch (error) {
    return sendVolunteerError(res, error, 'complete_task_failed', 'Failed to complete volunteer task.');
  }
}

/**
 * @description 查询志愿者培训考核与证书记录
 * @param {import('express').Request} req HTTP 请求对象
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>}
 */
async function getTraining(req, res) {
  try {
    const data = await volunteerService.getTraining(req.volunteerScope, req.query);
    return ok(res, data, 'Volunteer training records loaded.');
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