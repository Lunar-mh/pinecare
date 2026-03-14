'use strict';

const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const UserModel = require('../models/user');
const { fail } = require('../utils/response');

const ADMIN_SESSION_PREFIX = 'auth:admin:session:';

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    return null;
  }
  return secret;
}

function isCurrentlyLocked(user) {
  return (
    user &&
    user.account_status === 'locked' &&
    user.locked_until &&
    new Date(user.locked_until).getTime() > Date.now()
  );
}

function isAdminIdentity(userId, decoded) {
  return Number(userId) === 0 && (decoded.isAdmin === true || decoded.role === 'admin');
}

function adminSessionKey(sessionId) {
  return `${ADMIN_SESSION_PREFIX}${sessionId}`;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 401, 'Authentication token is missing.', null, 401);
  }

  const secret = getJwtSecret();
  if (!secret) {
    return fail(res, 500, 'JWT_SECRET is required for token verification.', null, 500);
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, secret);
    const userId = Number(decoded.userId);

    if (!Number.isInteger(userId) || userId < 0) {
      return fail(res, 401, 'Authentication token is invalid or expired.', null, 401);
    }

    const isAdminToken = isAdminIdentity(userId, decoded);

    if (isAdminToken) {
      const sid = String(decoded.sid || '').trim();
      if (!sid) {
        return fail(res, 401, 'Authentication token is invalid or expired.', null, 401);
      }

      try {
        const sessionFlag = await redis.get(adminSessionKey(sid));
        if (!sessionFlag) {
          return fail(res, 401, 'Authentication token is invalid or expired.', null, 401);
        }
      } catch (_err) {
        return fail(res, 503, 'Authentication service is temporarily unavailable.', null, 503);
      }
    } else {
      if (userId <= 0) {
        return fail(res, 401, 'Authentication token is invalid or expired.', null, 401);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return fail(res, 401, 'Authentication token is invalid or expired.', null, 401);
      }

      if (user.account_status === 'deleted') {
        return fail(res, 403, 'Account has been deleted.', null, 403);
      }

      if (isCurrentlyLocked(user)) {
        return fail(res, 423, 'Account is locked.', { locked_until: user.locked_until }, 423);
      }
    }

    req.user = {
      userId,
      role: decoded.role || null,
      isAdmin: isAdminToken,
    };
    return next();
  } catch (err) {
    if (err && (err.code || err.statusCode)) {
      return next(err);
    }
    return fail(res, 401, 'Authentication token is invalid or expired.', null, 401);
  }
}

module.exports = authMiddleware;
