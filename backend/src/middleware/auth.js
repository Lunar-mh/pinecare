'use strict';

const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    return null;
  }
  return secret;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 401, 'Unauthorized.', null, 401);
  }

  const secret = getJwtSecret();
  if (!secret) {
    return fail(res, 500, 'JWT_SECRET is not configured.', null, 500);
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, secret);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      isAdmin: Boolean(decoded.isAdmin),
    };
    return next();
  } catch (_err) {
    return fail(res, 401, 'Invalid token.', null, 401);
  }
}

module.exports = authMiddleware;
