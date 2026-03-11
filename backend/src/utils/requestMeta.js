'use strict';

function takeFirstForwardedIp(value) {
  return (
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .find(Boolean) || ''
  );
}

function getClientIp(req) {
  const forwarded = takeFirstForwardedIp(req && req.headers ? req.headers['x-forwarded-for'] : '');
  if (forwarded) {
    return forwarded;
  }

  return (req && req.ip) || '';
}

function getRequestContext(req) {
  return {
    ipAddress: getClientIp(req),
    userAgent: String((req && req.headers && req.headers['user-agent']) || ''),
    requestId: (req && req.requestId) || null,
  };
}

module.exports = {
  getClientIp,
  getRequestContext,
};
