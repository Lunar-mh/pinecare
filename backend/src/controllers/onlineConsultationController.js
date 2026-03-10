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
  const message = err.message || '在线问诊处理失败';
  return fail(res, code, message, null, status);
}

async function start(req, res) {
  try {
    const data = await onlineConsultationService.start(req.user.userId, {
      doctorId: req.body.doctorId,
      department: req.body.department,
    });

    return ok(res, data, '在线问诊创建成功');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  start,
};
