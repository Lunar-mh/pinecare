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

function buildEvidenceDocuments() {
  return [
    {
      key: 'deployment_playbook',
      title: 'Backend deployment playbook',
      path: 'backend/docs/deployment-playbook.md',
    },
    {
      key: 'compliance_package',
      title: 'Compliance and contest package',
      path: 'backend/docs/compliance-and-contest-package.md',
    },
    {
      key: 'real_data_evidence',
      title: 'Real data evidence pack',
      path: 'backend/docs/real-data-evidence-pack.md',
    },
    {
      key: 'api_acceptance',
      title: 'API acceptance checklist',
      path: 'backend/docs/api-acceptance-checklist.md',
    },
  ];
}

function buildEvidenceChecklist(integrations, readiness, replay) {
  const liveReady = integrations.filter((item) => item.effectiveMode === 'live' && item.healthy);
  const fallbackOnly = integrations.filter((item) => item.effectiveMode !== 'live' && item.key !== 'competition_seed');

  return [
    {
      key: 'runtime_mode',
      status: readiness.ready ? 'ready' : 'attention',
      detail: `Runtime mode: ${resolveMode()}.`,
    },
    {
      key: 'live_integrations',
      status: liveReady.length >= 3 ? 'ready' : 'attention',
      detail: `${liveReady.length} integrations are currently live and healthy.`,
    },
    {
      key: 'fallback_integrations',
      status: fallbackOnly.length > 0 ? 'attention' : 'ready',
      detail: `${fallbackOnly.length} integrations still rely on stub, webhook, or fallback paths.`,
    },
    {
      key: 'competition_seed',
      status: integrations.some((item) => item.key === 'competition_seed' && item.healthy)
        ? 'ready'
        : 'attention',
      detail: 'Competition seed SQL, verification report, and replay assets should be present before defense.',
    },
    {
      key: 'event_replay',
      status: replay ? 'ready' : 'pending',
      detail: replay
        ? `Replay summary available for user ${replay.userId}.`
        : 'Provide userId to include a care-event replay summary in the evidence bundle.',
    },
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

  async getEvidenceBundle(query = {}) {
    const integrations = buildIntegrationRows();
    const readiness = await systemHealthService.getReadinessStatus();
    const careEventAudit = getCareEventAuditDiagnostics(20);
    const replay = query.userId ? await getEventReplay(query) : null;
    const competitionSeed = integrations.find((item) => item.key === 'competition_seed') || null;

    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      readiness,
      integrations,
      competitionSeed,
      recentErrors: getRecentThirdPartyErrors(20),
      careEventAudit,
      demoScenarios: {
        total: DEMO_SCENARIOS.length,
        ids: DEMO_SCENARIOS.map((item) => item.id),
        warnings: buildScenarioWarnings(),
      },
      replay,
      evidenceDocuments: buildEvidenceDocuments(),
      competitionDataAssets: buildCompetitionAssetMetadata(),
      checklist: buildEvidenceChecklist(integrations, readiness, replay),
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
      seedManifest: COMPETITION_SEED_MANIFEST,
    };
  },

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
