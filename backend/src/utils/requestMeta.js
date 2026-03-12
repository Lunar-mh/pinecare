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
  const contextIp =
    (req && req.requestContext && req.requestContext.ipAddress) || (req && req.ipAddress) || '';
  if (contextIp) {
    return String(contextIp);
  }

  const forwardedIp = takeFirstForwardedIp(req && req.headers ? req.headers['x-forwarded-for'] : '');
  if (forwardedIp) {
    return forwardedIp;
  }

  const requestIp =
    (req && req.ip) ||
    (req && req.socket && req.socket.remoteAddress) ||
    (req && req.connection && req.connection.remoteAddress) ||
    '';
  if (requestIp) {
    return String(requestIp);
  }

  return '';
}

function getRequestContext(req) {
  return {
    ipAddress: getClientIp(req),
    userAgent:
      (req && req.requestContext && req.requestContext.userAgent) ||
      String((req && req.headers && req.headers['user-agent']) || ''),
    requestId:
      (req && req.requestContext && req.requestContext.requestId) ||
      (req && req.requestId) ||
      null,
  };
}

module.exports = {
  getClientIp,
  getRequestContext,
};
