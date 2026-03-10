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
  const message = err.message || 'Medical reports request failed.';
  return fail(res, code, message, null, status);
}

async function list(req, res) {
  try {
    const data = await medicalReportService.list(req.user.userId, {
      reportType: req.query.reportType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  list,
};
