'use strict';

const medicalReportService = require('../services/medicalReportService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code =
    typeof err.code === 'number'
      ? err.code
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : code;
  const message = err.message || '检查报告查询失败';
  return fail(res, code, message, null, status);
}

async function list(req, res) {
  try {
    const data = await medicalReportService.list(req.user.userId, {
      reportType: req.query.reportType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return ok(res, data, '检查报告查询成功');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  list,
};
