'use strict';

const { ok, fail } = require('../utils/response');
const adminUserService = require('../services/adminUserService');
const { validatePhone, validateRequired } = require('../utils/validators');

function ensureAdmin(req, res) {
  if (req.user && (req.user.isAdmin === true || req.user.role === 'admin')) {
    return true;
  }
  fail(res, 403, 'Forbidden.', null, 403);
  return false;
}

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

const adminUserController = {
  async list(req, res) {
    if (!ensureAdmin(req, res)) return;
    try {
      const data = await adminUserService.listUsers(req.query);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async detail(req, res) {
    if (!ensureAdmin(req, res)) return;
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 400, 'Invalid userId.', null, 400);
    }

    try {
      const data = await adminUserService.getUserDetail(userId);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req, res) {
    if (!ensureAdmin(req, res)) return;

    const required = validateRequired(req.body || {}, ['nickname', 'phone', 'role']);
    if (!required.valid) {
      return fail(res, 400, required.message, null, 400);
    }

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) {
      return fail(res, 400, phoneCheck.message, null, 400);
    }

    if (!['elder', 'family'].includes(String(req.body.role))) {
      return fail(res, 400, 'Invalid role.', null, 400);
    }

    try {
      const data = await adminUserService.createUser(req.body);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateStatus(req, res) {
    if (!ensureAdmin(req, res)) return;

    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 400, 'Invalid userId.', null, 400);
    }

    const required = validateRequired(req.body || {}, ['status']);
    if (!required.valid) {
      return fail(res, 400, required.message, null, 400);
    }

    try {
      await adminUserService.updateUserStatus(userId, req.body.status);
      return ok(res, null, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = adminUserController;
