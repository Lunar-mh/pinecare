'use strict';

const AuditLogModel = require('../../models/auditLog');

const SQL_HOUR_MS = 60 * 60 * 1000;

function createBizError(message, code = 400, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizePagination(query = {}) {
  return {
    page: Math.max(Number(query.page) || 1, 1),
    pageSize: Math.min(Math.max(Number(query.pageSize || query.page_size) || 10, 1), 100),
  };
}

function trimText(value) {
  return value ? String(value).trim() : '';
}

function numberOrNull(value) {
  return value == null ? null : Number(value);
}

function requireVolunteerScope(scope) {
  if (!scope || !scope.communityId || !scope.userId) {
    throw createBizError('Volunteer scope is required.', 403, 403);
  }
}

function ensureTask(task) {
  if (!task) {
    throw createBizError('Task not found.', 404, 404);
  }
}

function ensureOwnedTask(scope, task) {
  ensureTask(task);
  if (task.volunteer_id !== null && Number(task.volunteer_id) !== Number(scope.userId)) {
    throw createBizError('Forbidden.', 403, 403);
  }
}

function ensureAssignedToCurrentVolunteer(scope, task) {
  if (Number(task.volunteer_id) !== Number(scope.userId)) {
    throw createBizError('Forbidden.', 403, 403);
  }
}

function ensureTaskStatus(task, statuses, message) {
  const allowed = Array.isArray(statuses) ? statuses : [statuses];
  if (!allowed.includes(task.status)) {
    throw createBizError(message, 409, 409);
  }
}

async function writeAuditLog(scope, action, details = null) {
  await AuditLogModel.create({
    userId: numberOrNull(scope && scope.userId),
    action,
    details,
  });
}

function toMySqlDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function nowMySqlDateTime() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function parseSqlDateTime(value) {
  return value ? new Date(String(value).replace(' ', 'T') + 'Z') : null;
}

function resolveServiceTimeRange(task, attendanceLog, completedAt) {
  const endDate = parseSqlDateTime(completedAt) || new Date();
  const startDate =
    parseSqlDateTime(attendanceLog && attendanceLog.check_in_at) ||
    parseSqlDateTime(task && task.scheduled_at) ||
    new Date(endDate.getTime() - SQL_HOUR_MS);

  if (Number.isNaN(startDate.getTime()) || startDate.getTime() >= endDate.getTime()) {
    return {
      startTime: toMySqlDateTime(new Date(endDate.getTime() - SQL_HOUR_MS)),
      endTime: toMySqlDateTime(endDate),
    };
  }

  return {
    startTime: toMySqlDateTime(startDate),
    endTime: toMySqlDateTime(endDate),
  };
}

function buildPagination(pagination, total) {
  return {
    page: pagination.page,
    page_size: pagination.pageSize,
    total,
  };
}

function buildTaskAudit(scope, taskId, fromStatus, toStatus, extra = {}) {
  return {
    community_id: Number(scope.communityId),
    order_id: Number(taskId),
    volunteer_user_id: Number(scope.userId),
    status_from: fromStatus,
    status_to: toStatus,
    ...extra,
  };
}

function buildTaskState(taskId, status, extra = {}) {
  return {
    task_id: Number(taskId),
    status,
    ...extra,
  };
}

module.exports = {
  createBizError,
  normalizePagination,
  trimText,
  requireVolunteerScope,
  ensureOwnedTask,
  ensureAssignedToCurrentVolunteer,
  ensureTaskStatus,
  writeAuditLog,
  nowMySqlDateTime,
  resolveServiceTimeRange,
  buildPagination,
  buildTaskAudit,
  buildTaskState,
};
