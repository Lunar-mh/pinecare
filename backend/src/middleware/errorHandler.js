'use strict';

function sanitizeMessage(message) {
  const raw = String(message || 'Internal server error.');

  return raw
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|access[_-]?key|secret|token)=([^\s&]+)/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s)]+/gi, '[REDACTED_URL]');
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = sanitizeMessage(err.message || 'Internal server error.');
  const requestId = req.requestId || null;

  console.error('global_error', {
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
    response.stack = err.stack;
    response.requestId = requestId;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
