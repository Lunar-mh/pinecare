'use strict';

const { ok, fail } = require('../utils/response');
const fenceService = require('../services/fenceService');

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

const fenceController = {
  async list(req, res) {
    try {
      const data = await fenceService.list(req.user.userId);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req, res) {
    try {
      const data = await fenceService.create(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async update(req, res) {
    try {
      const fenceId = parsePositiveInt(req.params.fenceId);
      if (!fenceId) {
        return fail(res, 400, 'Invalid fence id.', null, 400);
      }

      const data = await fenceService.update(req.user.userId, fenceId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async remove(req, res) {
    try {
      const fenceId = parsePositiveInt(req.params.fenceId);
      if (!fenceId) {
        return fail(res, 400, 'Invalid fence id.', null, 400);
      }

      await fenceService.remove(req.user.userId, fenceId);
      return ok(res, null, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async toggle(req, res) {
    try {
      const fenceId = parsePositiveInt(req.params.fenceId);
      if (!fenceId) {
        return fail(res, 400, 'Invalid fence id.', null, 400);
      }

      const isActive = req.body && req.body.isActive;
      const data = await fenceService.toggle(req.user.userId, fenceId, isActive);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = fenceController;
