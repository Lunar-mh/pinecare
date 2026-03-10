'use strict';

const familyAccessService = require('../services/familyAccessService');
const { fail } = require('../utils/response');

/**
 * 家属访问控制中间件
 * 仅对 today/trend 的 user_id 执行关系校验
 */
async function familyAccess(req, res, next) {
  try {
    const currentUserId = req.user && req.user.userId;
    if (!currentUserId) {
      return fail(res, 401, '未登录或登录已失效', null, 401);
    }

    const targetUserId = familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);
    req.targetUserId = targetUserId;

    await familyAccessService.assertAccess(currentUserId, targetUserId);
    return next();
  } catch (err) {
    const code = typeof err.code === 'number' ? err.code : 500;
    const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
    return fail(res, code, err.message || '服务器内部错误', null, status);
  }
}

module.exports = familyAccess;
