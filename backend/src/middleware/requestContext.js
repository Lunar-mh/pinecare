'use strict';

const { v4: uuidv4 } = require('uuid');

function normalizeRequestId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.length > 100) return '';
  return /^[A-Za-z0-9._:-]+$/.test(raw) ? raw : '';
}

function requestContext(req, res, next) {
  const incoming = normalizeRequestId(req.headers['x-request-id'] || req.headers['x-requestid']);
  const requestId = incoming || uuidv4();

  req.requestId = requestId;
  req.id = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}

module.exports = requestContext;
