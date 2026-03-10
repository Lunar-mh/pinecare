'use strict';

const appointmentService = require('../services/appointmentService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code =
    typeof err.code === 'number'
      ? err.code
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : code;
  const message = err.message || 'Appointment request failed.';
  return fail(res, code, message, null, status);
}

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
    return handleError(res, err);
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
    return handleError(res, err);
  }
}

async function cancel(req, res) {
  try {
    const data = await appointmentService.cancel(req.user.userId, req.params.appointmentId);
    const message = data.idempotent ? 'idempotent replay' : 'cancelled';
    return ok(res, data, message);
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  create,
  list,
  cancel,
};
