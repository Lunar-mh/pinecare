'use strict';

const adminScopeModel = require('../models/adminScopeModel');
const { fail } = require('../utils/response');

async function volunteerAuth(req, res, next) {
  try {
    if (!req.user) {
      return fail(res, 401, 'Authentication required.', null, 401);
    }

    const userId = Number(req.user.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 401, 'Authentication required.', null, 401);
    }

    const scope = await adminScopeModel.findVolunteerScopeByUserId(userId);
    if (!scope) {
      return fail(res, 403, 'Volunteer access denied.', null, 403);
    }

    req.volunteerScope = scope;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = volunteerAuth;