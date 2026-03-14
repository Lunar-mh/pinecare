'use strict';

const jwt = require('jsonwebtoken');
const UserModel = require('../models/user');
const { fail } = require('../utils/response');

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
    const isAdmin = Boolean(decoded.isAdmin);
    const role = decoded.role;

    // 基本 payload 完整性校验（管理员和普通用户都需要）
    if (!Number.isInteger(userId) || userId < 0) {
      return fail(res, 401, 'Authentication token is invalid or expired.', null, 401);
    }

    // 管理员 token (userId === 0) 不查库，但要验证 role 声明
    const isAdminToken = (isAdmin === true || role === 'admin') && userId === 0;

    if (!isAdminToken) {
      // 普通用户：必须 userId > 0 且查库验证
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
      role: role || null,
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
