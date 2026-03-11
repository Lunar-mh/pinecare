'use strict';

const fs = require('fs');
const path = require('path');
const AuditLogModel = require('../../models/auditLog');
const aiService = require('../aiService');
const voiceService = require('../voiceService');
const medicalApiService = require('../medicalApiService');
const ossService = require('../ossService');
const { DEMO_SCENARIOS, getDemoScenarioById } = require('../../config/demoScenarios');
const { COMPETITION_SEED_MANIFEST } = require('../../data/competitionSeedManifest');
const { COMPETITION_SEED_ASSETS } = require('../../data/competitionSeedAssets');
const { resolveMode, isProductionLive } = require('../../config/runtimeMode');
const { getRecentThirdPartyErrors } = require('../../utils/thirdParty');
const wechatNotifier = require('../../utils/wechatNotifier');
const smsNotifyService = require('../smsNotifyService');
const wechatNotifyService = require('../wechatNotifyService');
const {
  buildEmptyPagedResult,
  buildPagination,
  createBizError,
  isSchemaMissingError,
  normalizePagination,
  parsePositiveInt,
} = require('./shared');

function getCompetitionSeedAssetStatus() {
  const outputDir = path.join(__dirname, '..', '..', '..', 'generated', 'competition-seed');
  const bootstrapSqlPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSql);
  const summaryPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.summary);
  const bootstrapSummaryPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSummary);

  return {
    outputDir: COMPETITION_SEED_ASSETS.outputDir,
    generated: fs.existsSync(summaryPath) || fs.existsSync(bootstrapSummaryPath),
    sqlReady: fs.existsSync(bootstrapSqlPath),
    files: COMPETITION_SEED_ASSETS.files,
    commands: COMPETITION_SEED_ASSETS.commands,
  };
}

function buildIntegrationRows() {
  const aiCapability = aiService.getCapabilityReport();
  const voiceCapability = voiceService.getCapabilityReport();
  const ossCapability = ossService.getCapabilityReport();
  const medicalCapability =
    typeof medicalApiService.getCapabilityReport === 'function'
      ? medicalApiService.getCapabilityReport()
      : null;
  const medicalSource = medicalApiService.getSourceTag();
  const wechatCapability = wechatNotifier.getCapabilityReport();
  const sosSmsCapability = smsNotifyService.getCapabilityReport();
  const sosWechatCapability = wechatNotifyService.getCapabilityReport();
  const competitionSeed = getCompetitionSeedAssetStatus();
  const runtimeMode = resolveMode();

  return [
    {
      key: 'ai_consult',
      configured: aiCapability.liveConfigured,
      mode: aiCapability.requestedMode,
      effectiveMode: aiCapability.effectiveMode,
      fallbackAllowed: aiCapability.fallbackAllowed,
    },
    {
      key: 'voice',
      configured: voiceCapability.liveConfigured,
      mode: voiceCapability.requestedMode,
      effectiveMode: voiceCapability.effectiveMode,
      fallbackAllowed: voiceCapability.fallbackAllowed,
    },
    {
      key: 'oss',
      configured: ossCapability.liveConfigured,
      mode: ossCapability.requestedMode,
      effectiveMode: ossCapability.effectiveMode,
      fallbackAllowed: ossCapability.fallbackAllowed,
    },
    {
      key: 'competition_seed',
      configured: competitionSeed.generated,
      mode: 'local',
      effectiveMode: competitionSeed.sqlReady
        ? 'ready'
        : competitionSeed.generated
          ? 'partial'
          : 'missing',
      fallbackAllowed: false,
      source: 'local_generated_assets',
      missingConfig: [],
      circuitOpen: false,
      generated: competitionSeed.generated,
      sqlReady: competitionSeed.sqlReady,
      assetFiles: competitionSeed.files,
      commands: competitionSeed.commands,
      notes: competitionSeed.sqlReady
        ? 'Competition seed SQL is ready for direct MySQL bootstrap.'
        : competitionSeed.generated
          ? 'Competition seed JSON assets exist but bootstrap.sql has not been generated yet.'
          : 'Competition seed assets have not been generated in this workspace yet.',
      healthy: competitionSeed.generated,
      runtimeMode,
      configState: competitionSeed.generated ? 'ready' : 'missing',
    },
    {
      key: 'medical',
      configured: Boolean(medicalCapability && medicalCapability.liveConfigured),
      mode: medicalCapability ? medicalCapability.mode : 'auto',
      effectiveMode:
        medicalCapability && medicalCapability.effectiveMode
          ? medicalCapability.effectiveMode
          : medicalSource === 'third_party_live'
            ? 'live'
            : 'stub',
      fallbackAllowed: Boolean(medicalCapability && medicalCapability.fallbackAllowed),
      source: medicalSource,
      missingConfig:
        medicalCapability && Array.isArray(medicalCapability.missingConfig)
          ? medicalCapability.missingConfig
          : [],
      circuitOpen: Boolean(medicalCapability && medicalCapability.circuitOpen),
      notes:
        medicalSource === 'third_party_live'
          ? 'Medical requests currently use the live upstream integration path.'
          : 'Medical requests currently use curated dataset fallback or deterministic stub data for competition replay.',
    },
    {
      key: 'wechat_notify',
      configured: wechatCapability.liveConfigured,
      mode: wechatCapability.requestedMode,
      effectiveMode: wechatCapability.effectiveMode,
      fallbackAllowed: wechatCapability.fallbackAllowed,
      source: 'wechat_template_api',
      missingConfig: wechatCapability.missingConfig,
      notes:
        wechatCapability.effectiveMode === 'live'
          ? 'WeChat template notify currently uses the live platform API path.'
          : 'WeChat template notify currently uses deterministic mock responses for sandbox replay.',
    },
    {
      key: 'sos_sms_notify',
      configured: sosSmsCapability.configured,
      mode: sosSmsCapability.mode,
      effectiveMode: sosSmsCapability.effectiveMode,
      fallbackAllowed: sosSmsCapability.fallbackAllowed,
      source: sosSmsCapability.source,
      missingConfig: sosSmsCapability.missingConfig,
      notes: sosSmsCapability.notes,
      healthy: sosSmsCapability.healthy,
    },
    {
      key: 'sos_wechat_notify',
      configured: sosWechatCapability.configured,
      mode: sosWechatCapability.mode,
      effectiveMode: sosWechatCapability.effectiveMode,
      fallbackAllowed: sosWechatCapability.fallbackAllowed,
      source: sosWechatCapability.source,
      missingConfig: sosWechatCapability.missingConfig,
      notes: sosWechatCapability.notes,
      healthy: sosWechatCapability.healthy,
    },
  ].map((item) => ({
    ...item,
    runtimeMode,
    configState: item.configured ? 'ready' : 'missing',
    healthy:
      item.effectiveMode === 'live' ? item.configured : item.fallbackAllowed || item.configured,
  }));
}

const adminDiagnosticsService = {
  async getIntegrationStatus() {
    const items = buildIntegrationRows();
    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      items,
      recentErrors: getRecentThirdPartyErrors(10),
      summary: {
        healthyCount: items.filter((item) => item.healthy).length,
        totalCount: items.length,
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

      return {
        list,
        pagination: buildPagination(page, pageSize, total),
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return buildEmptyPagedResult(page, pageSize);
      }
      throw err;
    }
  },

  async getDemoScenarios() {
    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      seedManifest: COMPETITION_SEED_MANIFEST,
      competitionDataAssets: {
        outputDir: COMPETITION_SEED_ASSETS.outputDir,
        commands: COMPETITION_SEED_ASSETS.commands,
        files: COMPETITION_SEED_ASSETS.files,
      },
      scenarios: DEMO_SCENARIOS.map((scenario, index) => ({
        ...scenario,
        order: index + 1,
      })),
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
      competitionDataAssets: {
        outputDir: COMPETITION_SEED_ASSETS.outputDir,
        commands: COMPETITION_SEED_ASSETS.commands,
        files: COMPETITION_SEED_ASSETS.files,
      },
      modules: scenario.modules,
      apiSequence: scenario.apiSequence,
      checklist: scenario.checklist,
      replayLog,
      warnings: [
        isProductionLive()
          ? 'PRODUCTION_LIVE enabled. Stub fallback paths are restricted.'
          : 'Sandbox mode active. Demo fallback paths remain available.',
      ],
    };
  },
};

module.exports = adminDiagnosticsService;

