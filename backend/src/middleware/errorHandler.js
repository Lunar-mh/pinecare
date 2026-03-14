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
  if (!Number.isInteger(parsed) || parsed < 100 || parsed > 599) {
    return 500;
  }
  return parsed;
}

function shouldExposeMessage(err, statusCode) {
  if (String((err && err.message) || '') === 'CORS origin not allowed.') {
    return true;
  }

  const hasBusinessCode = Boolean(err && (err.code !== undefined || err.statusCode !== undefined || err.status !== undefined));
  if (!hasBusinessCode) {
    return false;
  }

  return statusCode < 500;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = resolveStatusCode(err);
  const rawMessage = String((err && err.message) || 'Internal server error.');
  const message = shouldExposeMessage(err, statusCode)
    ? sanitizeMessage(rawMessage)
    : 'Internal server error.';
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
    response.requestId = requestId;
    logger.error('http', 'global_error_stack', {
      requestId,
      stack: err && err.stack ? err.stack : null,
    });
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
