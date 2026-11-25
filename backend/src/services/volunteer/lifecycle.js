'use strict';

const volunteerModel = require('../../models/volunteerModel');
const { runInTransaction } = require('../../utils/transaction');
const {
  requireVolunteerScope,
  ensureAssignedToCurrentVolunteer,
  ensureTaskStatus,
  writeAuditLog,
  nowMySqlDateTime,
  resolveServiceTimeRange,
  buildTaskAudit,
  buildTaskState,
  createBizError,
} = require('./shared');
const { loadOwnedTask } = require('./queries');

async function acceptTask(scope, taskId) {
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

  await writeAuditLog(scope, 'volunteer.task.accept', buildTaskAudit(scope, taskId, task.status, 'assigned'));
  return buildTaskState(taskId, 'assigned', { volunteer_id: Number(scope.userId) });
}

async function checkInTask(scope, taskId) {
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
  await writeAuditLog(scope, 'volunteer.task.check_in', buildTaskAudit(scope, taskId, task.status, 'processing', { check_in_at: checkInAt }));

  return buildTaskState(taskId, 'processing', { check_in_at: checkInAt });
}

async function checkOutTask(scope, taskId) {
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
  await writeAuditLog(scope, 'volunteer.task.check_out', buildTaskAudit(scope, taskId, task.status, task.status, { check_out_at: checkOutAt }));

  return buildTaskState(taskId, 'processing', { check_out_at: checkOutAt });
}

/**
 * @description 完成助老志愿工单（在事务内原子更新工单状态并沉淀签退与工时存证）
 * @param {object} scope 志愿者会话作用域
 * @param {number} taskId 工单ID
 * @returns {Promise<object>} 完成状态与工时结算信息
 */
async function completeTask(scope, taskId) {
  requireVolunteerScope(scope);
  const task = await loadOwnedTask(scope, taskId);
  ensureAssignedToCurrentVolunteer(scope, task);
  ensureTaskStatus(task, ['assigned', 'processing'], 'Only assigned or processing tasks can be completed.');

  const completedAt = nowMySqlDateTime();
  const attendanceLog = await volunteerModel.getAttendanceByOrderId(scope, taskId);
  const serviceTime = resolveServiceTimeRange(task, attendanceLog, completedAt);
  const startMs = new Date(serviceTime.startTime).getTime();
  const endMs = new Date(serviceTime.endTime).getTime();
  const rawHours = (endMs - startMs) / (1000 * 60 * 60);
  const durationHours = Math.max(0.5, Math.min(8.0, Math.round((Number.isFinite(rawHours) && rawHours > 0 ? rawHours : 1.0) * 10) / 10));

  await runInTransaction(async (conn) => {
    await volunteerModel.updateOwnedTaskStatus(taskId, scope.userId, 'completed', { completedAt }, conn);
    await volunteerModel.upsertAttendance({
      orderId: taskId,
      communityId: scope.communityId,
      volunteerUserId: scope.userId,
      checkOutAt: completedAt,
    }, conn);
  });

  await writeAuditLog(scope, 'volunteer.task.complete', buildTaskAudit(scope, taskId, task.status, 'completed', {
    completed_at: completedAt,
    duration_hours: durationHours,
  }));

  return buildTaskState(taskId, 'completed', {
    completed_at: completedAt,
    settlement: {
      duration_hours: durationHours,
      completed_at: completedAt,
      status: 'completed',
    },
  });
}

module.exports = {
  acceptTask,
  checkInTask,
  checkOutTask,
  completeTask,
};