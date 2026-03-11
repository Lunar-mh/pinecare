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
    const rawCommunityId = req.query.community_id !== undefined ? req.query.community_id : req.body.community_id;
    if (rawCommunityId === undefined || rawCommunityId === null || rawCommunityId === '') {
      return { ok: true, status: 200, code: 0 };
    }

    const requestedCommunityId = Number(rawCommunityId);
    if (!Number.isInteger(requestedCommunityId) || requestedCommunityId <= 0) {
      return { ok: false, status: 400, code: 400, message: 'community_id must be a positive integer.' };
    }

    req.adminScope.communityId = requestedCommunityId;
    return { ok: true, status: 200, code: 0 };
  }

  const scopeCommunityId = req.adminScope ? Number(req.adminScope.communityId) : null;
  const rawCommunityId = req.query.community_id !== undefined ? req.query.community_id : req.body.community_id;

  if (rawCommunityId === undefined || rawCommunityId === null || rawCommunityId === '') {
    return { ok: true, status: 200, code: 0 };
  }

  const requestedCommunityId = Number(rawCommunityId);
  if (!Number.isInteger(requestedCommunityId) || requestedCommunityId <= 0) {
    return { ok: false, status: 400, code: 400, message: 'community_id must be a positive integer.' };
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

  if (!body.service_type || typeof body.service_type !== 'string' || body.service_type.trim() === '') {
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

  if (req.body && req.body.scheduled_at && Number.isNaN(new Date(req.body.scheduled_at).getTime())) {
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
  if (req.query.start_date !== undefined && Number.isNaN(new Date(req.query.start_date).getTime())) {
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
};

