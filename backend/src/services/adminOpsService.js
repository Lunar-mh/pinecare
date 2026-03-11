'use strict';

const adminCareOverviewService = require('./adminOps/adminCareOverviewService');
const adminIncidentOpsService = require('./adminOps/adminIncidentOpsService');
const adminDiagnosticsService = require('./adminOps/adminDiagnosticsService');

module.exports = {
  ...adminCareOverviewService,
  ...adminIncidentOpsService,
  ...adminDiagnosticsService,
};
