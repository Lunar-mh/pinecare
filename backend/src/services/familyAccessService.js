'use strict';

const familyRelationModel = require('../models/familyRelationModel');

/**
 * 创建业务错误
 * @param {number} code
 * @param {string} message
 * @param {number} [statusCode]
 * @returns {Error}
 */
function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

const familyAccessService = {
  /**
   * 解析目标用户 ID（为空则视为本人）
   * @param {number} currentUserId
   * @param {any} requestedUserId
   * @returns {number}
   */
  resolveTargetUserId(currentUserId, requestedUserId) {
    if (requestedUserId === undefined || requestedUserId === null || requestedUserId === '') {
      return currentUserId;
    }

    const targetUserId = Number(requestedUserId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw createBizError(400, 'user_id 非法', 400);
    }

    return targetUserId;
  },

  /**
   * 判断是否有权限访问目标用户
   * @param {number} caregiverId
   * @param {number} elderId
   * @returns {Promise<boolean>}
   */
  async canAccess(caregiverId, elderId) {
    if (caregiverId === elderId) {
      return true;
    }

    return familyRelationModel.checkRelation(caregiverId, elderId);
  },

  /**
   * 断言访问权限（无权限抛 403）
   * @param {number} caregiverId
   * @param {number} elderId
   * @returns {Promise<void>}
   */
  async assertAccess(caregiverId, elderId) {
    const allowed = await this.canAccess(caregiverId, elderId);
    if (!allowed) {
      throw createBizError(403, '无权访问该用户健康数据', 403);
    }
  },
};

module.exports = familyAccessService;
