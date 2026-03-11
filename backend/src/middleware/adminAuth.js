'use strict';

const adminScopeModel = require('../models/adminScopeModel');
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

async function adminAuth(req, res, next) {
  try {
    if (!req.user) {
      return fail(res, 401, 'Unauthorized.', null, 401);
    }

    const isGlobalAdmin = req.user.isAdmin === true || req.user.role === 'admin';
    if (isGlobalAdmin) {
      const fallbackCommunityId = Number(process.env.ADMIN_DEFAULT_COMMUNITY_ID || 1);
      const requested = getRequestedCommunityId(req);
      const scopeCommunityId = requested === undefined ? fallbackCommunityId : parsePositiveInt(requested);

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

    const scope = await adminScopeModel.findCommunityAdminScopeByUserId(userId);
    if (!scope) {
      return fail(res, 403, 'Forbidden.', null, 403);
    }

    req.adminScope = scope;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = adminAuth;
