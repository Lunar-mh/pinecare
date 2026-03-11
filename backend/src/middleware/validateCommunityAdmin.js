'use strict';

const { fail } = require('../utils/response');

const ORDER_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const ADMIN_ROLE_ENUM = ['admin', 'leader', 'volunteer'];
const COMMUNITY_MANAGED_ORDER_STATUS_ENUM = ['cancelled', 'completed'];
const MAX_PAGE_SIZE = 100;

function getPageSize(source) {
  return source.pageSize !== undefined ? source.pageSize : source.page_size;
}

function validatePagination(source) {
  const { page } = source;
  const pageSize = getPageSize(source);

  if (page !== undefined) {
    const n = Number(page);
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, message: 'page must be a positive integer.' };
    }
  }

  if (pageSize !== undefined) {
    const n = Number(pageSize);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PAGE_SIZE) {
      return { ok: false, message: `page_size/pageSize must be in 1-${MAX_PAGE_SIZE}.` };
    }
  }

  return { ok: true };
}

function validateCommunityScope(req) {
  if (req.adminScope && req.adminScope.isGlobalAdmin === true) {
    const rawCommunityId =
      req.query.community_id !== undefined ? req.query.community_id : req.body.community_id;
    if (rawCommunityId === undefined || rawCommunityId === null || rawCommunityId === '') {
      return { ok: true, status: 200, code: 0 };
    }

    const requestedCommunityId = Number(rawCommunityId);
    if (!Number.isInteger(requestedCommunityId) || requestedCommunityId <= 0) {
      return {
        ok: false,
        status: 400,
        code: 400,
        message: 'community_id must be a positive integer.',
      };
    }

    req.adminScope.communityId = requestedCommunityId;
    return { ok: true, status: 200, code: 0 };
  }

  const scopeCommunityId = req.adminScope ? Number(req.adminScope.communityId) : null;
  const rawCommunityId =
    req.query.community_id !== undefined ? req.query.community_id : req.body.community_id;

  if (rawCommunityId === undefined || rawCommunityId === null || rawCommunityId === '') {
    return { ok: true, status: 200, code: 0 };
  }

  const requestedCommunityId = Number(rawCommunityId);
  if (!Number.isInteger(requestedCommunityId) || requestedCommunityId <= 0) {
    return {
      ok: false,
      status: 400,
      code: 400,
      message: 'community_id must be a positive integer.',
    };
  }

  if (!scopeCommunityId || requestedCommunityId !== scopeCommunityId) {
    return { ok: false, status: 403, code: 403, message: 'Forbidden.' };
  }

  return { ok: true, status: 200, code: 0 };
}

function validateVolunteerQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (req.query.role !== undefined && !ADMIN_ROLE_ENUM.includes(req.query.role)) {
    return fail(res, 400, 'Invalid role.', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateOrderId(req, res, next) {
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return fail(res, 400, 'orderId must be a positive integer.', null, 400);
  }

  req.params.orderId = String(orderId);
  return next();
}

function validateOrderQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (req.query.status !== undefined && !ORDER_STATUS_ENUM.includes(req.query.status)) {
    return fail(res, 400, 'status 枚举值非法', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateCreateOrder(req, res, next) {
  const body = req.body || {};

  if (
    !body.service_type ||
    typeof body.service_type !== 'string' ||
    body.service_type.trim() === ''
  ) {
    return fail(res, 400, 'service_type is required.', null, 400);
  }

  const elderId = Number(body.elder_id);
  if (!Number.isInteger(elderId) || elderId <= 0) {
    return fail(res, 400, 'elder_id must be a positive integer.', null, 400);
  }

  if (body.volunteer_id !== undefined && body.volunteer_id !== null) {
    const volunteerId = Number(body.volunteer_id);
    if (!Number.isInteger(volunteerId) || volunteerId <= 0) {
      return fail(res, 400, 'volunteer_id must be a positive integer.', null, 400);
    }
  }

  if (body.status !== undefined && !ORDER_STATUS_ENUM.includes(body.status)) {
    return fail(res, 400, 'status 枚举值非法', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateAssignOrder(req, res, next) {
  const volunteerId = Number(req.body && req.body.volunteer_id);
  if (!Number.isInteger(volunteerId) || volunteerId <= 0) {
    return fail(res, 400, 'volunteer_id must be a positive integer.', null, 400);
  }

  if (
    req.body &&
    req.body.scheduled_at &&
    Number.isNaN(new Date(req.body.scheduled_at).getTime())
  ) {
    return fail(res, 400, 'Invalid scheduled_at.', null, 400);
  }

  return next();
}

function validateUpdateOrderStatus(req, res, next) {
  const status = req.body && req.body.status;
  if (!status || !COMMUNITY_MANAGED_ORDER_STATUS_ENUM.includes(status)) {
    return fail(
      res,
      400,
      `status must be one of: ${COMMUNITY_MANAGED_ORDER_STATUS_ENUM.join(', ')}.`,
      null,
      400
    );
  }

  if (req.body && req.body.reason !== undefined && typeof req.body.reason !== 'string') {
    return fail(res, 400, 'reason must be a string.', null, 400);
  }

  return next();
}

function validateActivityQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateCreateActivity(req, res, next) {
  const body = req.body || {};

  if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
    return fail(res, 400, 'title is required.', null, 400);
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    return fail(res, 400, 'content is required.', null, 400);
  }

  if (!body.start_time || Number.isNaN(new Date(body.start_time).getTime())) {
    return fail(res, 400, 'Invalid start_time.', null, 400);
  }

  if (!body.end_time || Number.isNaN(new Date(body.end_time).getTime())) {
    return fail(res, 400, 'Invalid end_time.', null, 400);
  }

  if (new Date(body.start_time).getTime() >= new Date(body.end_time).getTime()) {
    return fail(res, 400, 'start_time 必须早于 end_time', null, 400);
  }

  if (body.max_participants !== undefined && body.max_participants !== null) {
    const maxParticipants = Number(body.max_participants);
    if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
      return fail(res, 400, 'max_participants must be a positive integer.', null, 400);
    }
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateStatsQuery(req, res, next) {
  if (
    req.query.start_date !== undefined &&
    Number.isNaN(new Date(req.query.start_date).getTime())
  ) {
    return fail(res, 400, 'Invalid start_date.', null, 400);
  }

  if (req.query.end_date !== undefined && Number.isNaN(new Date(req.query.end_date).getTime())) {
    return fail(res, 400, 'Invalid end_date.', null, 400);
  }

  if (req.query.start_date && req.query.end_date) {
    const startMs = new Date(req.query.start_date).getTime();
    const endMs = new Date(req.query.end_date).getTime();
    if (startMs > endMs) {
      return fail(res, 400, 'start_date cannot be later than end_date.', null, 400);
    }
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateHealthOverviewQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateMedicationLogsQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (
    req.query.status !== undefined &&
    !['pending', 'taken', 'skipped', 'missed'].includes(req.query.status)
  ) {
    return fail(res, 400, 'status is invalid.', null, 400);
  }

  if (req.query.startDate !== undefined && Number.isNaN(new Date(req.query.startDate).getTime())) {
    return fail(res, 400, 'startDate is invalid.', null, 400);
  }

  if (req.query.endDate !== undefined && Number.isNaN(new Date(req.query.endDate).getTime())) {
    return fail(res, 400, 'endDate is invalid.', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateMedicationLogId(req, res, next) {
  const logId = Number(req.params.logId);
  if (!Number.isInteger(logId) || logId <= 0) {
    return fail(res, 400, 'logId must be a positive integer.', null, 400);
  }

  req.params.logId = String(logId);
  return next();
}

function validateMedicationLogStatus(req, res, next) {
  const status = req.body && req.body.status;
  if (!status || !['pending', 'taken', 'skipped', 'missed'].includes(status)) {
    return fail(res, 400, 'status must be one of: pending, taken, skipped, missed.', null, 400);
  }

  return next();
}

function validateGpsCurrentQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateGpsTrailQuery(req, res, next) {
  const userId = Number(req.query.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return fail(res, 400, 'userId must be a positive integer.', null, 400);
  }

  if (!req.query.startDate || Number.isNaN(new Date(req.query.startDate).getTime())) {
    return fail(res, 400, 'startDate is invalid.', null, 400);
  }

  if (!req.query.endDate || Number.isNaN(new Date(req.query.endDate).getTime())) {
    return fail(res, 400, 'endDate is invalid.', null, 400);
  }

  if (new Date(req.query.endDate).getTime() < new Date(req.query.startDate).getTime()) {
    return fail(res, 400, 'endDate must be >= startDate.', null, 400);
  }

  if (req.query.limit !== undefined) {
    const limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 5000) {
      return fail(res, 400, 'limit must be in 1-5000.', null, 400);
    }
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateFamilyBindingsQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateSosEventQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (
    req.query.status !== undefined &&
    !['triggered', 'confirmed', 'resolved', 'cancelled'].includes(req.query.status)
  ) {
    return fail(res, 400, 'status is invalid.', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateSosEventId(req, res, next) {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return fail(res, 400, 'eventId must be a positive integer.', null, 400);
  }

  req.params.eventId = String(eventId);
  return next();
}

function validateMedicalReportsQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (req.query.startDate !== undefined && Number.isNaN(new Date(req.query.startDate).getTime())) {
    return fail(res, 400, 'startDate is invalid.', null, 400);
  }

  if (req.query.endDate !== undefined && Number.isNaN(new Date(req.query.endDate).getTime())) {
    return fail(res, 400, 'endDate is invalid.', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateUpdateSosEventStatus(req, res, next) {
  const status = req.body && req.body.status;
  if (!status || !['confirmed', 'resolved', 'cancelled'].includes(status)) {
    return fail(res, 400, 'status must be one of: confirmed, resolved, cancelled.', null, 400);
  }

  if (req.body && req.body.reason !== undefined && typeof req.body.reason !== 'string') {
    return fail(res, 400, 'reason must be a string.', null, 400);
  }

  return next();
}

function validateFallEventsQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (
    req.query.status !== undefined &&
    !['detecting', 'confirmed', 'cancelled', 'false_alarm'].includes(req.query.status)
  ) {
    return fail(res, 400, 'status is invalid.', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateDrugInteractionsQuery(req, res, next) {
  if (req.query.status !== undefined && !['pending', 'acknowledged'].includes(req.query.status)) {
    return fail(res, 400, 'status is invalid.', null, 400);
  }

  if (req.query.limit !== undefined) {
    const limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      return fail(res, 400, 'limit must be in 1-1000.', null, 400);
    }
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateDrugInteractionId(req, res, next) {
  const interactionId = Number(req.params.interactionId);
  if (!Number.isInteger(interactionId) || interactionId <= 0) {
    return fail(res, 400, 'interactionId must be a positive integer.', null, 400);
  }

  req.params.interactionId = String(interactionId);
  return next();
}

function validateDrugInteractionStatus(req, res, next) {
  const status = req.body && req.body.status;
  if (!status || !['pending', 'acknowledged'].includes(status)) {
    return fail(res, 400, 'status must be one of: pending, acknowledged.', null, 400);
  }

  return next();
}

function validateTimeBankServiceHistoryQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (
    req.query.status !== undefined &&
    !['pending', 'confirmed', 'cancelled'].includes(req.query.status)
  ) {
    return fail(res, 400, 'status is invalid.', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateTimeBankServiceConfirm(req, res, next) {
  const recordId = Number(req.body && req.body.recordId);
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return fail(res, 400, 'recordId must be a positive integer.', null, 400);
  }

  const action = req.body && req.body.action;
  if (!action || !['confirm', 'cancel'].includes(action)) {
    return fail(res, 400, 'action must be one of: confirm, cancel.', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateTimeBankExchangeHistoryQuery(req, res, next) {
  if (req.query.limit !== undefined) {
    const limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      return fail(res, 400, 'limit must be in 1-1000.', null, 400);
    }
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

function validateTimeBankLeaderboardQuery(req, res, next) {
  if (req.query.limit !== undefined) {
    const limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      return fail(res, 400, 'limit must be in 1-500.', null, 400);
    }
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

  return next();
}

module.exports = {
  validateVolunteerQuery,
  validateOrderQuery,
  validateOrderId,
  validateCreateOrder,
  validateAssignOrder,
  validateUpdateOrderStatus,
  validateActivityQuery,
  validateCreateActivity,
  validateStatsQuery,
  validateHealthOverviewQuery,
  validateMedicationLogsQuery,
  validateMedicationLogId,
  validateMedicationLogStatus,
  validateGpsCurrentQuery,
  validateGpsTrailQuery,
  validateFamilyBindingsQuery,
  validateSosEventQuery,
  validateSosEventId,
  validateMedicalReportsQuery,
  validateUpdateSosEventStatus,
  validateFallEventsQuery,
  validateDrugInteractionsQuery,
  validateDrugInteractionId,
  validateDrugInteractionStatus,
  validateTimeBankServiceHistoryQuery,
  validateTimeBankServiceConfirm,
  validateTimeBankExchangeHistoryQuery,
  validateTimeBankLeaderboardQuery,
};
