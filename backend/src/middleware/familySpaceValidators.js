'use strict';

const { fail } = require('../utils/response');

const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function validatePagination(req, res, next) {
  const { page, pageSize } = req.query;

  if (page !== undefined) {
    const parsedPage = parsePositiveInteger(page);
    if (!parsedPage) {
      return fail(res, 400, 'page 必须为正整数', null, 400);
    }
    req.query.page = String(parsedPage);
  }

  if (pageSize !== undefined) {
    const parsedPageSize = parsePositiveInteger(pageSize);
    if (!parsedPageSize || parsedPageSize > MAX_PAGE_SIZE) {
      return fail(res, 400, `pageSize 必须为 1-${MAX_PAGE_SIZE} 的整数`, null, 400);
    }
    req.query.pageSize = String(parsedPageSize);
  }

  return next();
}

function validateSendMessage(req, res, next) {
  const body = req.body || {};
  const toUserId = parsePositiveInteger(body.to_user_id);
  const durationSeconds = parsePositiveInteger(body.duration_seconds);

  if (!toUserId) {
    return fail(res, 400, 'to_user_id 必须为正整数', null, 400);
  }

  if (!durationSeconds) {
    return fail(res, 400, 'duration_seconds 必须为正整数', null, 400);
  }

  if (durationSeconds > 600) {
    return fail(res, 400, 'duration_seconds 不能超过 600 秒', null, 400);
  }

  req.body.to_user_id = toUserId;
  req.body.duration_seconds = durationSeconds;
  return next();
}

function validateUploadAlbum(req, res, next) {
  const body = req.body || {};
  const familyId = parsePositiveInteger(body.family_id);
  const captionRaw = body.caption;

  if (!familyId) {
    return fail(res, 400, 'family_id 必须为正整数', null, 400);
  }

  const caption = typeof captionRaw === 'string' ? captionRaw.trim() : '';
  if (caption.length > 200) {
    return fail(res, 400, 'caption 长度不能超过 200 个字符', null, 400);
  }

  req.body.family_id = familyId;
  req.body.caption = caption;
  return next();
}

function validateFamilyIdQuery(req, res, next) {
  const familyId = parsePositiveInteger(req.query.family_id);
  if (!familyId) {
    return fail(res, 400, 'family_id 必须为正整数', null, 400);
  }

  req.query.family_id = String(familyId);
  return next();
}

module.exports = {
  validatePagination,
  validateSendMessage,
  validateUploadAlbum,
  validateFamilyIdQuery,
};
