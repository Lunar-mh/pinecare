'use strict';

const volunteerModel = require('../../models/volunteerModel');
const { requireVolunteerScope, ensureOwnedTask, normalizePagination, trimText, buildPagination, createBizError } = require('./shared');

async function loadOwnedTask(scope, taskId) {
  const task = await volunteerModel.findTaskByIdForVolunteer(scope, taskId);
  ensureOwnedTask(scope, task);
  return task;
}

async function getTasks(scope, query = {}) {
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
}

async function getProfile(scope) {
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
}

async function getTraining(scope, query = {}) {
  requireVolunteerScope(scope);
  const pagination = normalizePagination(query);
  const filters = { status: trimText(query.status) };
  const [list, total] = await Promise.all([
    volunteerModel.listTrainingByVolunteerId(scope, filters, pagination),
    volunteerModel.countTrainingByVolunteerId(scope, filters),
  ]);

  return { list, pagination: buildPagination(pagination, total) };
}

module.exports = {
  loadOwnedTask,
  getTasks,
  getProfile,
  getTraining,
};