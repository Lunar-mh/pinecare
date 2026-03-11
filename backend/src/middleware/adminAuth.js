'use strict';

const { query } = require('../config/database');
const { fail } = require('../utils/response');

function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getRequestedCommunityId(req) {
  const fromQuery = req.query && req.query.community_id;
  const fromBody = req.body && req.body.community_id;
  return fromQuery !== undefined ? fromQuery : fromBody;
}

/**
 * 社区管理权限中间件
 * - 普通社区管理员：根据 community_admins 表校验并注入作用域
 * - 全局 admin token：直接放行，并支持按 community_id 指定作用域
 */
async function adminAuth(req, res, next) {
  try {
    if (!req.user) {
      return fail(res, 401, 'Unauthorized.', null, 401);
    }

    const isGlobalAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    if (isGlobalAdmin) {
      const fallbackCommunityId = Number(process.env.ADMIN_DEFAULT_COMMUNITY_ID || 1);
      const requested = getRequestedCommunityId(req);
      const scopeCommunityId = requested === undefined
        ? fallbackCommunityId
        : parsePositiveInt(requested);

      if (!parsePositiveInt(scopeCommunityId)) {
        return fail(res, 400, 'Invalid community_id.', null, 400);
      }

      req.adminScope = {
        adminId: 0,
        userId: Number(req.user.userId || 0),
        communityId: Number(scopeCommunityId),
        role: 'admin',
        isGlobalAdmin: true,
      };
      return next();
    }

    const userId = Number(req.user.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 401, 'Unauthorized.', null, 401);
    }

    const [rows] = await query(
      `SELECT id, user_id, community_id, role
       FROM community_admins
       WHERE user_id = ?
         AND role IN ('admin', 'leader')
       ORDER BY id ASC
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return fail(res, 403, 'Forbidden.', null, 403);
    }

    const admin = rows[0];
    req.adminScope = {
      adminId: Number(admin.id),
      userId: Number(admin.user_id),
      communityId: Number(admin.community_id),
      role: admin.role,
      isGlobalAdmin: false,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = adminAuth;
