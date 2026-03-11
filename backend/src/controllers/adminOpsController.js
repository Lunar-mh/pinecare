'use strict';

const { ok, fail } = require('../utils/response');
const adminOpsService = require('../services/adminOpsService');

function ensureAdmin(req, res) {
  if (req.user && (req.user.isAdmin === true || req.user.role === 'admin')) {
    return true;
  }

  fail(res, 403, 'Forbidden.', null, 403);
  return false;
}

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message || 'Request failed.', null, status);
  }

  return fail(res, 500, 'Internal server error.', null, 500);
}

const adminOpsController = {
  async healthOverview(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getHealthOverview(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async medicationLogs(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getMedicationLogs(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateMedicationLogStatus(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.updateMedicationLogStatus(
        req.params.logId,
        req.body || {}
      );
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async gpsCurrent(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getGpsCurrent(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async gpsTrail(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getGpsTrail(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async familyBindings(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getFamilyBindings(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async medicalReports(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getMedicalReports(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async sosEvents(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getSosEvents(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateSosEventStatus(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.updateSosEventStatus(req.params.eventId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async fallEvents(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getFallEvents(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async drugInteractions(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getDrugInteractions(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async updateDrugInteractionStatus(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.updateDrugInteractionStatus(
        req.params.interactionId,
        req.body || {}
      );
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async timeBankServiceHistory(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getTimeBankServiceHistory(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async confirmTimeBankService(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.confirmTimeBankService(req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async timeBankExchangeHistory(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getTimeBankExchangeHistory(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async timeBankLeaderboard(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getTimeBankLeaderboard(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async integrationStatus(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getIntegrationStatus();
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async auditLogs(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getAuditLogs(req.query || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async demoScenarios(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.getDemoScenarios();
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async demoBootstrap(req, res) {
    if (!ensureAdmin(req, res)) return;

    try {
      const data = await adminOpsService.bootstrapDemoScenario(req.body || {}, req.user || null);
      return ok(res, data, 'ok');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = adminOpsController;
