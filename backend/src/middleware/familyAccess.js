'use strict';

const familyAccessService = require('../services/familyAccessService');
const { fail } = require('../utils/response');
const logger = require('../utils/logger');

async function familyAccess(req, res, next) {
  try {
    const currentUserId = req.user && req.user.userId;
    if (!currentUserId) {
      return fail(res, 401, 'Authentication required.', null, 401);
    }

    const targetUserId = familyAccessService.resolveTargetUserId(currentUserId, req.query && req.query.user_id);
    await familyAccessService.assertAccess(currentUserId, targetUserId);

    req.targetUserId = targetUserId;
    return next();
  } catch (error) {
    const code = Number(error && (error.code || error.statusCode) ? error.code || error.statusCode : 500);
    const status = Number(error && (error.statusCode || error.code) ? error.statusCode || error.code : 500);
    const message = error && error.message ? error.message : 'Family access check failed.';

    logger.error('familyAccess', 'access_denied', {
      coded: Boolean(error && (error.code || error.statusCode)),
      code,
      message,
    });

    return fail(res, code, message, null, status);
  }
}

module.exports = familyAccess;
