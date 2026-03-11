'use strict';

const AuditLogModel = require('../models/auditLog');
const volunteerModel = require('../models/volunteerModel');
const timeBankService = require('./timeBankService');

function createBizError(message, code = 400, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function normalizePagination(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize || query.page_size) || 10, 1), 100);
  return { page, pageSize };
}

function requireVolunteerScope(scope) {
  if (!scope || !scope.communityId || !scope.userId) {
    throw createBizError('Volunteer scope is required.', 403, 403);
  }
}

function ensureOwnedTask(scope, task) {
  if (!task) {
    throw createBizError('Task not found.', 404, 404);
  }

  if (task.volunteer_id !== null && Number(task.volunteer_id) !== Number(scope.userId)) {
    throw createBizError('Forbidden.', 403, 403);
  }
}

async function writeAuditLog(scope, action, details = null) {
  await AuditLogModel.create({
    userId: scope && scope.userId ? Number(scope.userId) : null,
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

function resolveServiceTimeRange(task, attendanceLog, completedAt) {
  const endDate = completedAt ? new Date(completedAt.replace(' ', 'T') + 'Z') : new Date();
  const startDate =
    attendanceLog && attendanceLog.check_in_at
      ? new Date(String(attendanceLog.check_in_at).replace(' ', 'T') + 'Z')
      : task && task.scheduled_at
        ? new Date(String(task.scheduled_at).replace(' ', 'T') + 'Z')
        : new Date(endDate.getTime() - 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || startDate.getTime() >= endDate.getTime()) {
    return {
      startTime: toMySqlDateTime(new Date(endDate.getTime() - 60 * 60 * 1000)),
      endTime: toMySqlDateTime(endDate),
    };
  }

  return {
    startTime: toMySqlDateTime(startDate),
    endTime: toMySqlDateTime(endDate),
  };
}

const volunteerService = {
  async getTasks(scope, query = {}) {
    requireVolunteerScope(scope);
    const pagination = normalizePagination(query);
    const filters = {
      status: query.status ? String(query.status).trim() : '',
      keyword: query.keyword ? String(query.keyword).trim() : '',
    };

    const [list, total, summary] = await Promise.all([
      volunteerModel.listTasksByVolunteer(scope, filters, pagination),
      volunteerModel.countTasksByVolunteer(scope, filters),
      volunteerModel.countTaskSummary(scope),
    ]);

    return {
      list,
      pagination: {
        page: pagination.page,
        page_size: pagination.pageSize,
        total,
      },
      summary,
    };
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
    const filters = {
      status: query.status ? String(query.status).trim() : '',
    };

    const [list, total] = await Promise.all([
      volunteerModel.listTrainingByVolunteerId(scope, filters, pagination),
      volunteerModel.countTrainingByVolunteerId(scope, filters),
    ]);

    return {
      list,
      pagination: {
        page: pagination.page,
        page_size: pagination.pageSize,
        total,
      },
    };
  },

  async acceptTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await volunteerModel.findTaskByIdForVolunteer(scope, taskId);
    ensureOwnedTask(scope, task);

    if (task.volunteer_id !== null && Number(task.volunteer_id) === Number(scope.userId)) {
      throw createBizError('Task already accepted.', 409, 409);
    }

    if (task.status !== 'pending') {
      throw createBizError('Only pending tasks can be accepted.', 409, 409);
    }

    const result = await volunteerModel.acceptTask(taskId, scope);
    if (!result || result.affectedRows < 1) {
      throw createBizError('Task accept failed, please retry.', 409, 409);
    }

    await writeAuditLog(scope, 'volunteer.task.accept', {
      community_id: Number(scope.communityId),
      order_id: Number(taskId),
      volunteer_user_id: Number(scope.userId),
      status_from: task.status,
      status_to: 'assigned',
    });

    return {
      task_id: Number(taskId),
      status: 'assigned',
      volunteer_id: Number(scope.userId),
    };
  },

  async checkInTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await volunteerModel.findTaskByIdForVolunteer(scope, taskId);
    ensureOwnedTask(scope, task);

    if (Number(task.volunteer_id) !== Number(scope.userId)) {
      throw createBizError('Forbidden.', 403, 403);
    }

    if (task.status !== 'assigned') {
      throw createBizError('Only assigned tasks can be checked in.', 409, 409);
    }

    const checkInAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await volunteerModel.updateOwnedTaskStatus(taskId, scope.userId, 'processing');
    await volunteerModel.upsertAttendance({
      orderId: taskId,
      communityId: scope.communityId,
      volunteerUserId: scope.userId,
      checkInAt,
    });
    await writeAuditLog(scope, 'volunteer.task.check_in', {
      community_id: Number(scope.communityId),
      order_id: Number(taskId),
      volunteer_user_id: Number(scope.userId),
      status_from: task.status,
      status_to: 'processing',
      check_in_at: checkInAt,
    });

    return {
      task_id: Number(taskId),
      status: 'processing',
      check_in_at: checkInAt,
    };
  },

  async checkOutTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await volunteerModel.findTaskByIdForVolunteer(scope, taskId);
    ensureOwnedTask(scope, task);

    if (Number(task.volunteer_id) !== Number(scope.userId)) {
      throw createBizError('Forbidden.', 403, 403);
    }

    if (task.status !== 'processing') {
      throw createBizError('Only processing tasks can be checked out.', 409, 409);
    }

    const checkOutAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await volunteerModel.upsertAttendance({
      orderId: taskId,
      communityId: scope.communityId,
      volunteerUserId: scope.userId,
      checkOutAt,
    });
    await writeAuditLog(scope, 'volunteer.task.check_out', {
      community_id: Number(scope.communityId),
      order_id: Number(taskId),
      volunteer_user_id: Number(scope.userId),
      status_from: task.status,
      status_to: task.status,
      check_out_at: checkOutAt,
    });

    return {
      task_id: Number(taskId),
      status: 'processing',
      check_out_at: checkOutAt,
    };
  },

  async completeTask(scope, taskId) {
    requireVolunteerScope(scope);
    const task = await volunteerModel.findTaskByIdForVolunteer(scope, taskId);
    ensureOwnedTask(scope, task);

    if (Number(task.volunteer_id) !== Number(scope.userId)) {
      throw createBizError('Forbidden.', 403, 403);
    }

    if (!['assigned', 'processing'].includes(task.status)) {
      throw createBizError('Only assigned or processing tasks can be completed.', 409, 409);
    }

    const completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await volunteerModel.updateOwnedTaskStatus(taskId, scope.userId, 'completed', {
      completedAt,
    });
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

    await writeAuditLog(scope, 'volunteer.task.complete', {
      community_id: Number(scope.communityId),
      order_id: Number(taskId),
      volunteer_user_id: Number(scope.userId),
      status_from: task.status,
      status_to: 'completed',
      completed_at: completedAt,
      service_record_id: Number(serviceRecord.recordId),
      time_coins: Number(serviceRecord.timeCoins),
    });

    return {
      task_id: Number(taskId),
      status: 'completed',
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
    };
  },
};

module.exports = volunteerService;
