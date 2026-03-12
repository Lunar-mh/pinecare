'use strict';

const medicationHistoryService = require('../services/medicationHistoryService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

const medicationHistoryController = {
  async calendar(req, res) {
    try {
      const data = await medicationHistoryService.getCalendar(req.user.userId, req.query.month);
      return ok(res, data, 'Medication history loaded.');
    } catch (error) {
      return sendControllerError(res, error, {
        moduleName: 'medicationHistoryController',
        action: 'calendar_failed',
        defaultMessage: 'Failed to load medication history calendar.',
      });
    }
  },
};

module.exports = medicationHistoryController;
