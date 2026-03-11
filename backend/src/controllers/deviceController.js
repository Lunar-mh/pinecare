'use strict';

const deviceService = require('../services/deviceService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

const deviceController = {
  async bind(req, res) {
    try {
      const data = await deviceService.bind(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },

  async unbind(req, res) {
    try {
      const data = await deviceService.unbind(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },

  async list(req, res) {
    try {
      const data = await deviceService.list(req.user.userId);
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },

  async setPrimary(req, res) {
    try {
      const data = await deviceService.setPrimary(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  },
};

module.exports = deviceController;
