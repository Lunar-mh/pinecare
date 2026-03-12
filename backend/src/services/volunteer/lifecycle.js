'use strict';

const volunteerModel = require('../../models/volunteerModel');
const timeBankService = require('../timeBankService');
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

async function completeTask(scope, taskId) {
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

  await writeAuditLog(scope, 'volunteer.task.complete', buildTaskAudit(scope, taskId, task.status, 'completed', {
    completed_at: completedAt,
    service_record_id: Number(serviceRecord.recordId),
    time_coins: Number(serviceRecord.timeCoins),
  }));

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
}

module.exports = {
  acceptTask,
  checkInTask,
  checkOutTask,
  completeTask,
};