'use strict';

const { fail } = require('../utils/response');

const ORDER_STATUS_ENUM = ['pending', 'assigned', 'processing', 'completed', 'cancelled'];
const ADMIN_ROLE_ENUM = ['admin', 'leader', 'volunteer'];
const MAX_PAGE_SIZE = 100;

/**
 * 校验分页参数
 * @param {object} source
 * @returns {{ ok: boolean, message?: string }}
 */
function validatePagination(source) {
  const { page, page_size: pageSize } = source;

  if (page !== undefined) {
    const n = Number(page);
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, message: 'page 必须为大于等于1的整数' };
    }
  }

  if (pageSize !== undefined) {
    const n = Number(pageSize);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PAGE_SIZE) {
      return { ok: false, message: `page_size 必须为 1-${MAX_PAGE_SIZE} 的整数` };
    }
  }

  return { ok: true };
}

/**
 * 校验社区作用域参数，防止越权访问
 * @param {object} req
 * @returns {{ ok: boolean, status: number, code: number, message?: string }}
 */
function validateCommunityScope(req) {
  const scopeCommunityId = req.adminScope ? Number(req.adminScope.communityId) : null;
  const rawCommunityId = req.query.community_id !== undefined ? req.query.community_id : req.body.community_id;

  if (rawCommunityId === undefined || rawCommunityId === null || rawCommunityId === '') {
    return { ok: true, status: 200, code: 0 };
  }

  const requestedCommunityId = Number(rawCommunityId);
  if (!Number.isInteger(requestedCommunityId) || requestedCommunityId <= 0) {
    return { ok: false, status: 400, code: 400, message: 'community_id 必须为正整数' };
  }

  if (!scopeCommunityId || requestedCommunityId !== scopeCommunityId) {
    return { ok: false, status: 403, code: 403, message: '无权访问其他社区数据' };
  }

  return { ok: true, status: 200, code: 0 };
}

function validateVolunteerQuery(req, res, next) {
  const pageResult = validatePagination(req.query);
  if (!pageResult.ok) {
    return fail(res, 400, pageResult.message, null, 400);
  }

  if (req.query.role !== undefined && !ADMIN_ROLE_ENUM.includes(req.query.role)) {
    return fail(res, 400, 'role 枚举值非法', null, 400);
  }

  const scopeResult = validateCommunityScope(req);
  if (!scopeResult.ok) {
    return fail(res, scopeResult.code, scopeResult.message, null, scopeResult.status);
  }

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
    return fail(res, 400, 'service_type 为必填字符串', null, 400);
  }

  const elderId = Number(body.elder_id);
  if (!Number.isInteger(elderId) || elderId <= 0) {
    return fail(res, 400, 'elder_id 必须为正整数', null, 400);
  }

  if (body.volunteer_id !== undefined && body.volunteer_id !== null) {
    const volunteerId = Number(body.volunteer_id);
    if (!Number.isInteger(volunteerId) || volunteerId <= 0) {
      return fail(res, 400, 'volunteer_id 必须为正整数', null, 400);
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
    return fail(res, 400, 'title 为必填字符串', null, 400);
  }

  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    return fail(res, 400, 'content 为必填字符串', null, 400);
  }

  if (!body.start_time || Number.isNaN(new Date(body.start_time).getTime())) {
    return fail(res, 400, 'start_time 时间格式非法', null, 400);
  }

  if (!body.end_time || Number.isNaN(new Date(body.end_time).getTime())) {
    return fail(res, 400, 'end_time 时间格式非法', null, 400);
  }

  if (new Date(body.start_time).getTime() >= new Date(body.end_time).getTime()) {
    return fail(res, 400, 'start_time 必须早于 end_time', null, 400);
  }

  if (body.max_participants !== undefined && body.max_participants !== null) {
    const maxParticipants = Number(body.max_participants);
    if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
      return fail(res, 400, 'max_participants 必须为正整数', null, 400);
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
    return fail(res, 400, 'start_date 时间格式非法', null, 400);
  }

  if (req.query.end_date !== undefined && Number.isNaN(new Date(req.query.end_date).getTime())) {
    return fail(res, 400, 'end_date 时间格式非法', null, 400);
  }

  if (req.query.start_date && req.query.end_date) {
    const startMs = new Date(req.query.start_date).getTime();
    const endMs = new Date(req.query.end_date).getTime();
    if (startMs > endMs) {
      return fail(res, 400, 'start_date 不能晚于 end_date', null, 400);
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
  validateCreateOrder,
  validateActivityQuery,
  validateCreateActivity,
  validateStatsQuery,
};
