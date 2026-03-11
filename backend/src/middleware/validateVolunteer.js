'use strict';

const { fail } = require('../utils/response');

const TASK_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const TRAINING_STATUS_ENUM = ['pending', 'completed', 'expired'];
const MAX_PAGE_SIZE = 100;

function getPageSize(source = {}) {
  return source.pageSize !== undefined ? source.pageSize : source.page_size;
}

function validatePagination(source = {}) {
  if (source.page !== undefined) {
    const page = Number(source.page);
    if (!Number.isInteger(page) || page < 1) {
      return { ok: false, message: 'page must be a positive integer.' };
    }
  }

  const pageSize = getPageSize(source);
  if (pageSize !== undefined) {
    const parsed = Number(pageSize);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_PAGE_SIZE) {
      return { ok: false, message: `page_size/pageSize must be in 1-${MAX_PAGE_SIZE}.` };
    }
  }

  return { ok: true };
}

function validateTaskId(taskId) {
  const parsed = Number(taskId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function validateTaskQuery(req, res, next) {
  const pageResult = validatePagination(req.query || {});
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (req.query.status !== undefined && !TASK_STATUS_ENUM.includes(req.query.status)) {
    return fail(res, 400, 'status 枚举值非法', null, 400);
  }

  return next();
}

function validateTaskAction(req, res, next) {
  const taskId = validateTaskId(req.params.taskId);
  if (!taskId) {
    return fail(res, 400, 'taskId must be a positive integer.', null, 400);
  }

  req.params.taskId = String(taskId);
  return next();
}

function validateTrainingQuery(req, res, next) {
  const pageResult = validatePagination(req.query || {});
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (req.query.status !== undefined && !TRAINING_STATUS_ENUM.includes(req.query.status)) {
    return fail(res, 400, 'Invalid training status.', null, 400);
  }

  return next();
}

module.exports = {
  TASK_STATUS_ENUM,
  TRAINING_STATUS_ENUM,
  validateTaskQuery,
  validateTaskAction,
  validateTrainingQuery,
};
