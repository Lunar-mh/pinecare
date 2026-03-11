'use strict';

const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');
const adminOpsService = require('../services/adminOpsService');

function buildHandler(serviceCall) {
  return async (req, res) => {
    try {
      const data = await serviceCall(req);
      return ok(res, data, 'ok');
    } catch (err) {
      return sendControllerError(res, err);
    }
  };
}

module.exports = {
  healthOverview: buildHandler((req) => adminOpsService.getHealthOverview(req.query || {})),
  medicationLogs: buildHandler((req) => adminOpsService.getMedicationLogs(req.query || {})),
  updateMedicationLogStatus: buildHandler((req) =>
    adminOpsService.updateMedicationLogStatus(req.params.logId, req.body || {})
  ),
  gpsCurrent: buildHandler((req) => adminOpsService.getGpsCurrent(req.query || {})),
  gpsTrail: buildHandler((req) => adminOpsService.getGpsTrail(req.query || {})),
  familyBindings: buildHandler((req) => adminOpsService.getFamilyBindings(req.query || {})),
  medicalReports: buildHandler((req) => adminOpsService.getMedicalReports(req.query || {})),
  sosEvents: buildHandler((req) => adminOpsService.getSosEvents(req.query || {})),
  updateSosEventStatus: buildHandler((req) =>
    adminOpsService.updateSosEventStatus(req.params.eventId, req.body || {})
  ),
  fallEvents: buildHandler((req) => adminOpsService.getFallEvents(req.query || {})),
  drugInteractions: buildHandler((req) => adminOpsService.getDrugInteractions(req.query || {})),
  updateDrugInteractionStatus: buildHandler((req) =>
    adminOpsService.updateDrugInteractionStatus(req.params.interactionId, req.body || {})
  ),
  timeBankServiceHistory: buildHandler((req) =>
    adminOpsService.getTimeBankServiceHistory(req.query || {})
  ),
  confirmTimeBankService: buildHandler((req) =>
    adminOpsService.confirmTimeBankService(req.body || {})
  ),
  timeBankExchangeHistory: buildHandler((req) =>
    adminOpsService.getTimeBankExchangeHistory(req.query || {})
  ),
  timeBankLeaderboard: buildHandler((req) =>
    adminOpsService.getTimeBankLeaderboard(req.query || {})
  ),
  integrationStatus: buildHandler(() => adminOpsService.getIntegrationStatus()),
  auditLogs: buildHandler((req) => adminOpsService.getAuditLogs(req.query || {})),
  eventReplay: buildHandler((req) => adminOpsService.getEventReplay(req.query || {})),
  demoScenarios: buildHandler(() => adminOpsService.getDemoScenarios()),
  demoBootstrap: buildHandler((req) =>
    adminOpsService.bootstrapDemoScenario(req.body || {}, req.user || null)
  ),
};
