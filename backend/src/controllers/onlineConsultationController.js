'use strict';

const onlineConsultationService = require('../services/onlineConsultationService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code =
    typeof err.code === 'number'
      ? err.code
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : code;
  const message = err.message || 'Online consultation request failed.';
  return fail(res, code, message, null, status);
}

async function start(req, res) {
  try {
    const data = await onlineConsultationService.start(req.user.userId, {
      doctorId: req.body.doctorId,
      department: req.body.department,
    });

    return ok(res, data, 'created');
  } catch (err) {
    return handleError(res, err);
  }
}

async function list(req, res) {
  try {
    const data = await onlineConsultationService.listByUser(req.user.userId, req.query.limit);
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateStatus(req, res) {
  try {
    const data = await onlineConsultationService.updateStatus(
      req.user.userId,
      req.params.consultationId,
      req.body.consultStatus
    );

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  start,
  list,
  updateStatus,
};
