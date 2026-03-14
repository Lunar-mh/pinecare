'use strict';

const logger = require('../utils/logger');

function sanitizeMessage(message) {
  const raw = String(message || 'Internal server error.');

  return raw
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|access[_-]?key|secret|token)=([^\s&]+)/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s)]+/gi, '[REDACTED_URL]');
}

function resolveStatusCode(err) {
  if (String((err && err.message) || '') === 'CORS origin not allowed.') {
    return 403;
  }

  const rawCode = err.statusCode || err.status || err.code || 500;
  const parsed = Number(rawCode);
  // 确保返回有效的 HTTP 状态码数字
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 599) {
    return 500;
  }
  return parsed;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = resolveStatusCode(err);
  const message = sanitizeMessage(err.message || 'Internal server error.');
  const requestId = req.requestId || null;

  logger.error('http', 'global_error', {
    requestId,
    path: req.path,
    method: req.method,
    statusCode,
    message,
  });

  const response = {
    code: statusCode,
    message,
    data: null,
  };

  if (process.env.NODE_ENV !== 'production') {
    // 仅在日志中记录 stack，不返回给前端
    response.requestId = requestId;
    logger.error('http', 'global_error_stack', {
      requestId,
      stack: err.stack,
    });
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
