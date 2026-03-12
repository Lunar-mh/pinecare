'use strict';

const { fail } = require('../utils/response');
const { parseEnum, parsePagination, parsePositiveInt } = require('../utils/requestValidation');

const TASK_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const TRAINING_STATUS_ENUM = ['pending', 'completed', 'expired'];
const MAX_PAGE_SIZE = 100;

function validateTaskQuery(req, res, next) {
  const paginationResult = parsePagination(req.query || {}, {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPageSize: MAX_PAGE_SIZE,
  });
  if (!paginationResult.ok) {
    return fail(res, 400, paginationResult.message, null, 400);
  }

  if (req.query.status !== undefined && String(req.query.status).trim() !== '') {
    const statusResult = parseEnum(req.query.status, 'status', TASK_STATUS_ENUM);
    if (!statusResult.ok) {
      return fail(res, 400, statusResult.message, null, 400);
    }
    req.query.status = statusResult.data;
  }

  req.query.page = paginationResult.data.page;
  req.query.pageSize = paginationResult.data.pageSize;
  req.query.page_size = paginationResult.data.pageSize;
  return next();
}

function validateTaskAction(req, res, next) {
  const taskIdResult = parsePositiveInt(req.params && req.params.taskId, 'taskId');
  if (!taskIdResult.ok) {
    return fail(res, 400, taskIdResult.message, null, 400);
  }

  req.params.taskId = String(taskIdResult.data);
  return next();
}

function validateTrainingQuery(req, res, next) {
  const paginationResult = parsePagination(req.query || {}, {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPageSize: MAX_PAGE_SIZE,
  });
  if (!paginationResult.ok) {
    return fail(res, 400, paginationResult.message, null, 400);
  }

  if (req.query.status !== undefined && String(req.query.status).trim() !== '') {
    const statusResult = parseEnum(req.query.status, 'status', TRAINING_STATUS_ENUM);
    if (!statusResult.ok) {
      return fail(res, 400, statusResult.message, null, 400);
    }
    req.query.status = statusResult.data;
  }

  req.query.page = paginationResult.data.page;
  req.query.pageSize = paginationResult.data.pageSize;
  req.query.page_size = paginationResult.data.pageSize;
  return next();
}

module.exports = {
  TASK_STATUS_ENUM,
  TRAINING_STATUS_ENUM,
  validateTaskQuery,
  validateTaskAction,
  validateTrainingQuery,
};
