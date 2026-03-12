'use strict';

const medicalReportService = require('../services/medicalReportService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

async function list(req, res) {
  try {
    const data = await medicalReportService.list(req.user.userId, {
      reportType: req.query.reportType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    return ok(res, data, 'Medical reports loaded.');
  } catch (err) {
    return sendControllerError(res, err, {
      action: 'reports_failed',
      defaultMessage: 'Failed to load medical reports.',
      moduleName: 'medicalReportController',
      preferErrorMessage: true,
    });
  }
}

module.exports = {
  list,
};