'use strict';

const AuditLogModel = require('../../models/auditLog');
const systemHealthService = require('../systemHealthService');
const { getEventReplay } = require('./eventReplayService');
const { buildIntegrationRows } = require('./adminDiagnostics/integrationStatus');
const { DEMO_SCENARIOS, getDemoScenarioById } = require('../../config/demoScenarios');
const { COMPETITION_SEED_MANIFEST } = require('../../data/competitionSeedManifest');
const { COMPETITION_SEED_ASSETS } = require('../../data/competitionSeedAssets');
const { resolveMode, isProductionLive } = require('../../config/runtimeMode');
const { getRecentThirdPartyErrors } = require('../../utils/thirdParty');
const { getCareEventAuditDiagnostics } = require('../eventTimelineService');
const {
  buildEmptyPagedResult,
  buildPagination,
  createBizError,
  isSchemaMissingError,
  normalizePagination,
  parsePositiveInt,
} = require('./shared');

function buildCompetitionAssetMetadata() {
  return {
    outputDir: COMPETITION_SEED_ASSETS.outputDir,
    commands: COMPETITION_SEED_ASSETS.commands,
    files: COMPETITION_SEED_ASSETS.files,
  };
}

function buildScenarioWarnings() {
  return [
    isProductionLive()
      ? 'PRODUCTION_LIVE enabled. Stub fallback paths are restricted.'
      : 'Sandbox mode active. Demo fallback paths remain available.',
  ];
}

const adminDiagnosticsService = {
  async getIntegrationStatus() {
    const items = buildIntegrationRows();
    const readiness = await systemHealthService.getReadinessStatus();
    const careEventAudit = getCareEventAuditDiagnostics(10);

    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      items,
      readiness,
      recentErrors: getRecentThirdPartyErrors(10),
      careEventAudit,
      summary: {
        healthyCount: items.filter((item) => item.healthy).length,
        totalCount: items.length,
        readiness: readiness.ready,
        careEventAuditFailures: careEventAudit.totalFailures,
      },
    };
  },

  async getAuditLogs(query = {}) {
    const { page, pageSize } = normalizePagination(query, 20);
    const filters = {
      userId: query.userId ? parsePositiveInt(query.userId, 'userId') : null,
      action: query.action ? String(query.action).trim() : '',
    };

    try {
      const [list, total] = await Promise.all([
        AuditLogModel.list(filters, { page, pageSize }),
        AuditLogModel.count(filters),
      ]);
      return { list, pagination: buildPagination(page, pageSize, total) };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return buildEmptyPagedResult(page, pageSize);
      }
      throw err;
    }
  },

  getEventReplay,

  async getDemoScenarios() {
    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      seedManifest: COMPETITION_SEED_MANIFEST,
      competitionDataAssets: buildCompetitionAssetMetadata(),
      scenarios: DEMO_SCENARIOS.map((scenario, index) => ({ ...scenario, order: index + 1 })),
    };
  },

  async bootstrapDemoScenario(payload = {}, actor = null) {
    const scenarioId = String(payload.scenarioId || payload.id || '').trim();
    if (!scenarioId) {
      throw createBizError(400, 'scenarioId is required.', 400);
    }

    const scenario = getDemoScenarioById(scenarioId);
    if (!scenario) {
      throw createBizError(404, 'Demo scenario not found.', 404);
    }

    const bootstrapAt = new Date().toISOString();
    const replayLog = scenario.apiSequence.map((api, index) => ({
      step: index + 1,
      action: api,
      status: 'pending',
      note: scenario.checklist[index] || 'Ready for replay.',
    }));

    try {
      await AuditLogModel.create({
        userId: actor && actor.userId ? Number(actor.userId) : null,
        action: 'admin.demo.bootstrap',
        details: {
          scenarioId: scenario.id,
          runtimeMode: resolveMode(),
          bootstrapAt,
        },
      });
    } catch (err) {
      if (!isSchemaMissingError(err)) {
        throw err;
      }
    }

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      runtimeMode: resolveMode(),
      bootstrapAt,
      status: 'ready',
      bootstrap: scenario.bootstrap,
      preparedData: scenario.bootstrap,
      seedManifest: COMPETITION_SEED_MANIFEST,
      baselineCoverage: COMPETITION_SEED_MANIFEST.coverage,
      competitionDataAssets: buildCompetitionAssetMetadata(),
      modules: scenario.modules,
      apiSequence: scenario.apiSequence,
      checklist: scenario.checklist,
      replayLog,
      warnings: buildScenarioWarnings(),
    };
  },
};

module.exports = adminDiagnosticsService;
