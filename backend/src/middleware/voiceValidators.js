'use strict';

const { fail } = require('../utils/response');

const BASE64_REGEX = /^[A-Za-z0-9+/=\r\n]+$/;
const MAX_TEXT_LENGTH = 500;
const MAX_PAGE_SIZE = 50;

function normalizeAudio(audio) {
  if (typeof audio !== 'string') {
    return '';
  }
  const trimmed = audio.trim();
  const commaIndex = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && commaIndex > -1) {
    return trimmed.slice(commaIndex + 1).trim();
  }
  return trimmed;
}

function validatePagination(req, res, next) {
  const { page, pageSize } = req.query;

  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return fail(res, 400, 'page 必须为大于等于 1 的整数', null, 400);
    }
  }

  if (pageSize !== undefined) {
    const parsedPageSize = Number(pageSize);
    if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > MAX_PAGE_SIZE) {
      return fail(res, 400, `pageSize 必须为 1-${MAX_PAGE_SIZE} 的整数`, null, 400);
    }
  }

  return next();
}

function validateRecognize(req, res, next) {
  const body = req.body || {};
  const audio = normalizeAudio(body.audio !== undefined ? body.audio : body.audioData);

  if (!audio) {
    return fail(res, 400, 'audio 不能为空', null, 400);
  }

  if (!BASE64_REGEX.test(audio)) {
    return fail(res, 400, 'audio 必须为 base64 编码字符串', null, 400);
  }

  req.body.audioData = audio;
  return next();
}

function validateSynthesize(req, res, next) {
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!text) {
    return fail(res, 400, 'text 不能为空', null, 400);
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return fail(res, 400, `text 长度不能超过 ${MAX_TEXT_LENGTH} 个字符`, null, 400);
  }

  req.body.text = text;
  return next();
}

function validateSessionId(req, res, next) {
  const rawSessionId = req.params && req.params.sessionId;
  const sessionId = Number(rawSessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return fail(res, 400, 'sessionId 必须为正整数', null, 400);
  }

  req.params.sessionId = String(sessionId);
  return next();
}

module.exports = {
  validateRecognize,
  validateSynthesize,
  validatePagination,
  validateSessionId,
};
