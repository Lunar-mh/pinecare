'use strict';

const appointmentService = require('../services/appointmentService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

function getIdempotencyKey(req) {
  return req.headers['x-idempotency-key'] || req.headers['x-request-id'] || req.requestId || null;
}

async function create(req, res) {
  try {
    const data = await appointmentService.create(req.user.userId, {
      hospitalId: req.body.hospitalId,
      department: req.body.department,
      doctorId: req.body.doctorId,
      appointmentDate: req.body.appointmentDate,
      timeSlot: req.body.timeSlot,
      idempotencyKey: getIdempotencyKey(req),
    });

    const message = data.duplicate ? 'idempotent replay' : 'created';
    return ok(res, data, message);
  } catch (err) {
    return sendControllerError(res, err, { defaultMessage: 'Appointment request failed.' });
  }
}

async function list(req, res) {
  try {
    const data = await appointmentService.listByUser(req.user.userId, {
      status: req.query.status,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return sendControllerError(res, err, { defaultMessage: 'Appointment request failed.' });
  }
}

async function cancel(req, res) {
  try {
    const data = await appointmentService.cancel(req.user.userId, req.params.appointmentId);
    const message = data.idempotent ? 'idempotent replay' : 'cancelled';
    return ok(res, data, message);
  } catch (err) {
    return sendControllerError(res, err, { defaultMessage: 'Appointment request failed.' });
  }
}

module.exports = {
  create,
  list,
  cancel,
};
