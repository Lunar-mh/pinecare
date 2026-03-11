'use strict';

const AuditLogModel = require('../models/auditLog');
const volunteerModel = require('../models/volunteerModel');
const timeBankService = require('./timeBankService');

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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

async function loadOwnedTask(scope, taskId) {
  const task = await volunteerModel.findTaskByIdForVolunteer(scope, taskId);
  ensureOwnedTask(scope, task);
  return task;
}

const volunteerService = {
  async getTasks(scope, query = {}) {
    requireVolunteerScope(scope);
    const pagination = normalizePagination(query);
    const filters = {
      status: trimText(query.status),
      keyword: trimText(query.keyword),
    };

    const [list, total, summary] = await Promise.all([
      volunteerModel.listTasksByVolunteer(scope, filters, pagination),
      volunteerModel.countTasksByVolunteer(scope, filters),
      volunteerModel.countTaskSummary(scope),
    ]);

    return { list, pagination: buildPagination(pagination, total), summary };
  },

  async getProfile(scope) {
    requireVolunteerScope(scope);
    const [profile, summary] = await Promise.all([
      volunteerModel.findProfileByUserId(scope.userId, scope.communityId),
      volunteerModel.countTaskSummary(scope),
    ]);

    if (!profile) {
      throw createBizError('Volunteer not found.', 404, 404);
    }

    return {
      id: Number(profile.id),
      name: profile.name,
      phone: profile.phone,
      community_id: Number(profile.community_id),
      role: profile.role,
      joined_at: profile.created_at,
      task_summary: summary,
    };
  },

  async getTraining(scope, query = {}) {
    requireVolunteerScope(scope);
    const pagination = normalizePagination(query);
    const filters = { status: trimText(query.status) };
    const [list, total] = await Promise.all([
      volunteerModel.listTrainingByVolunteerId(scope, filters, pagination),
      volunteerModel.countTrainingByVolunteerId(scope, filters),
    ]);

    return { list, pagination: buildPagination(pagination, total) };
  },

  async acceptTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await loadOwnedTask(scope, taskId);

    if (Number(task.volunteer_id) === Number(scope.userId)) {
      throw createBizError('Task already accepted.', 409, 409);
    }

    ensureTaskStatus(task, 'pending', 'Only pending tasks can be accepted.');

    const result = await volunteerModel.acceptTask(taskId, scope);
    if (!result || result.affectedRows < 1) {
      throw createBizError('Task accept failed, please retry.', 409, 409);
    }

    await writeAuditLog(
      scope,
      'volunteer.task.accept',
      buildTaskAudit(scope, taskId, task.status, 'assigned')
    );

    return buildTaskState(taskId, 'assigned', { volunteer_id: Number(scope.userId) });
  },

  async checkInTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await loadOwnedTask(scope, taskId);
    ensureAssignedToCurrentVolunteer(scope, task);
    ensureTaskStatus(task, 'assigned', 'Only assigned tasks can be checked in.');

    const checkInAt = nowMySqlDateTime();
    await volunteerModel.updateOwnedTaskStatus(taskId, scope.userId, 'processing');
    await volunteerModel.upsertAttendance({
      orderId: taskId,
      communityId: scope.communityId,
      volunteerUserId: scope.userId,
      checkInAt,
    });
    await writeAuditLog(
      scope,
      'volunteer.task.check_in',
      buildTaskAudit(scope, taskId, task.status, 'processing', { check_in_at: checkInAt })
    );

    return buildTaskState(taskId, 'processing', { check_in_at: checkInAt });
  },

  async checkOutTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await loadOwnedTask(scope, taskId);
    ensureAssignedToCurrentVolunteer(scope, task);
    ensureTaskStatus(task, 'processing', 'Only processing tasks can be checked out.');

    const checkOutAt = nowMySqlDateTime();
    await volunteerModel.upsertAttendance({
      orderId: taskId,
      communityId: scope.communityId,
      volunteerUserId: scope.userId,
      checkOutAt,
    });
    await writeAuditLog(
      scope,
      'volunteer.task.check_out',
      buildTaskAudit(scope, taskId, task.status, task.status, { check_out_at: checkOutAt })
    );

    return buildTaskState(taskId, 'processing', { check_out_at: checkOutAt });
  },

  async completeTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await loadOwnedTask(scope, taskId);
    ensureAssignedToCurrentVolunteer(scope, task);
    ensureTaskStatus(task, ['assigned', 'processing'], 'Only assigned or processing tasks can be completed.');

    const completedAt = nowMySqlDateTime();
    await volunteerModel.updateOwnedTaskStatus(taskId, scope.userId, 'completed', { completedAt });
    await volunteerModel.upsertAttendance({
      orderId: taskId,
      communityId: scope.communityId,
      volunteerUserId: scope.userId,
      checkOutAt: completedAt,
    });

    const attendanceLog = await volunteerModel.getAttendanceByOrderId(scope, taskId);
    const serviceTime = resolveServiceTimeRange(task, attendanceLog, completedAt);
    const serviceRecord = await timeBankService.recordService(scope.userId, {
      recipientId: Number(task.elder_id),
      type: task.service_type,
      startTime: serviceTime.startTime,
      endTime: serviceTime.endTime,
      communityId: scope.communityId,
    });
    const settlement = await timeBankService.confirmService(scope.userId, {
      recordId: serviceRecord.recordId,
      action: 'confirm',
      communityId: scope.communityId,
    });

    await writeAuditLog(
      scope,
      'volunteer.task.complete',
      buildTaskAudit(scope, taskId, task.status, 'completed', {
        completed_at: completedAt,
        service_record_id: Number(serviceRecord.recordId),
        time_coins: Number(serviceRecord.timeCoins),
      })
    );

    return buildTaskState(taskId, 'completed', {
      completed_at: completedAt,
      settlement: {
        serviceRecord: {
          recordId: Number(serviceRecord.recordId),
          recordHash: serviceRecord.recordHash,
          prevHash: serviceRecord.prevHash,
          status: settlement.status || settlement.record?.status || 'confirmed',
          timeCoins: Number(serviceRecord.timeCoins),
        },
        account: settlement.account || null,
      },
    });
  },
};

module.exports = volunteerService;
