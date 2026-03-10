'use strict';

const { query } = require('../config/db');
const { fail } = require('../utils/response');

/**
 * 社区管理权限中间件
 * 仅允许 admin/leader 角色访问，并注入 adminScope
 */
async function adminAuth(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return fail(res, 401, '未登录或登录态无效', null, 401);
    }

    const userId = Number(req.user.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 401, '用户身份无效', null, 401);
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
      return fail(res, 403, '无社区管理权限', null, 403);
    }

    const admin = rows[0];
    req.adminScope = {
      adminId: Number(admin.id),
      userId: Number(admin.user_id),
      communityId: Number(admin.community_id),
      role: admin.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = adminAuth;
