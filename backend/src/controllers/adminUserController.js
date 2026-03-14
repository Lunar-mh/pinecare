'use strict';

const { ok, fail } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');
const adminUserService = require('../services/adminUserService');
const { validatePhone, validateRequired } = require('../utils/validators');

function handleError(res, err) {
  return sendControllerError(res, err);
}

const adminUserController = {
  async list(req, res) {
    try {
      const data = await adminUserService.listUsers(req.adminScope, req.query);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async detail(req, res) {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 400, 'Invalid userId.', null, 400);
    }

    try {
      const data = await adminUserService.getUserDetail(req.adminScope, userId);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req, res) {
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
      const data = await adminUserService.createUser(req.adminScope, req.body);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateStatus(req, res) {
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return fail(res, 400, 'Invalid userId.', null, 400);
    }

    const required = validateRequired(req.body || {}, ['status']);
    if (!required.valid) {
      return fail(res, 400, required.message, null, 400);
    }

    try {
      await adminUserService.updateUserStatus(req.adminScope, userId, req.body.status);
      return ok(res, null, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = adminUserController;
