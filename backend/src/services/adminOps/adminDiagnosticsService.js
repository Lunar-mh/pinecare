'use strict';

const AuditLogModel = require('../../models/auditLog');
const systemHealthService = require('../systemHealthService');
const { getEventReplay } = require('./eventReplayService');
const { buildIntegrationRows } = require('./adminDiagnostics/integrationStatus');
const { DEMO_SCENARIOS, getDemoScenarioById } = require('../../config/demoScenarios');
const { COMPETITION_SEED_MANIFEST } = require('../../data/competitionSeedManifest');
const { resolveMode } = require('../../config/runtimeMode');
const { getRecentThirdPartyErrors } = require('../../utils/thirdParty');
const { getCareEventAuditDiagnostics } = require('../eventTimelineService');
const {
  buildCompetitionAssetMetadata,
  buildEvidenceChecklist,
  buildEvidenceDocuments,
  buildDefenseScripts,
  buildDemoScenarioOverview,
  buildProviderEvidence,
  buildScenarioWarnings,
} = require('./adminDiagnostics/evidenceBundle');
const {
  buildEmptyPagedResult,
  buildPagination,
  createBizError,
  isSchemaMissingError,
  normalizePagination,
  parsePositiveInt,
} = require('./shared');

async function buildEvidenceBundle(query = {}) {
  const integrations = buildIntegrationRows();
  const readiness = await systemHealthService.getReadinessStatus();
  const careEventAudit = getCareEventAuditDiagnostics(20);
  const replay = query.userId ? await getEventReplay(query) : null;
  const competitionSeed = integrations.find((item) => item.key === 'competition_seed') || null;
  const providerEvidence = buildProviderEvidence(integrations);

  return {
    runtimeMode: resolveMode(),
    generatedAt: new Date().toISOString(),
    readiness,
    integrations,
    competitionSeed,
    recentErrors: getRecentThirdPartyErrors(20),
    careEventAudit,
    demoScenarios: buildDemoScenarioOverview(),
    replay,
    evidenceDocuments: buildEvidenceDocuments(),
    competitionDataAssets: buildCompetitionAssetMetadata(),
    checklist: buildEvidenceChecklist(integrations, readiness, replay),
    providerEvidence,
    defenseScripts: buildDefenseScripts(integrations, replay),
    commands: {
      install: 'npm install',
      lint: 'npm run lint',
      test: 'npm test',
      migrate: 'npm run migrate',
      freshInstallSmoke: 'npm run smoke:fresh-install',
      competitionSeedVerify: 'npm run seed:competition:verify -- --dry-run',
      competitionSeedSql: 'npm run seed:competition:sql',
    },
    contest: {
      category: 'software_application_and_development',
      positioning: 'smart elderly care platform with AI-assisted operations and community response',
      reminders: [
        'Prepare originality and authorization evidence before submission.',
        'Keep at least two authors available for onsite national defense.',
        'Provide a stable web entry or replay evidence package for judging.',
      ],
    },
    summary: {
      liveHealthyCount: providerEvidence.filter(
        (item) => item.healthy && item.effectiveMode === 'live'
      ).length,
      fallbackCount: providerEvidence.filter((item) => item.effectiveMode !== 'live').length,
      recentErrorCount: providerEvidence.filter((item) => item.recentError).length,
    },
    seedManifest: COMPETITION_SEED_MANIFEST,
  };
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

  getEvidenceBundle: buildEvidenceBundle,

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
