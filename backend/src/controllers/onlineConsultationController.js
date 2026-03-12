'use strict';

const onlineConsultationService = require('../services/onlineConsultationService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

async function start(req, res) {
  try {
    const data = await onlineConsultationService.start(req.user.userId, {
      doctorId: req.body.doctorId,
      department: req.body.department,
    });

    return ok(res, data, 'Online consultation created.');
  } catch (err) {
    return sendControllerError(res, err, {
      action: 'consult_start_failed',
      defaultMessage: 'Failed to create online consultation.',
      moduleName: 'onlineConsultationController',
      preferErrorMessage: true,
    });
  }
}

async function list(req, res) {
  try {
    const data = await onlineConsultationService.listByUser(req.user.userId, req.query.limit);
    return ok(res, data, 'Online consultation history loaded.');
  } catch (err) {
    return sendControllerError(res, err, {
      action: 'consult_list_failed',
      defaultMessage: 'Failed to load online consultation history.',
      moduleName: 'onlineConsultationController',
      preferErrorMessage: true,
    });
  }
}

async function updateStatus(req, res) {
  try {
    const data = await onlineConsultationService.updateStatus(
      req.user.userId,
      req.params.consultationId,
      req.body.consultStatus
    );

    return ok(res, data, 'Online consultation status updated.');
  } catch (err) {
    return sendControllerError(res, err, {
      action: 'consult_update_status_failed',
      defaultMessage: 'Failed to update online consultation status.',
      moduleName: 'onlineConsultationController',
      preferErrorMessage: true,
    });
  }
}

module.exports = {
  start,
  list,
  updateStatus,
};