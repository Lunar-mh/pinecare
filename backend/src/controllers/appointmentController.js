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
  const message = err.message || '预约挂号处理失败';
  return fail(res, code, message, null, status);
}

async function create(req, res) {
  try {
    const data = await appointmentService.create(req.user.userId, {
      hospitalId: req.body.hospitalId,
      department: req.body.department,
      doctorId: req.body.doctorId,
      appointmentDate: req.body.appointmentDate,
      timeSlot: req.body.timeSlot,
    });

    const message = data.duplicate ? '预约请求已处理，返回历史结果' : '预约挂号成功';
    return ok(res, data, message);
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  create,
};
