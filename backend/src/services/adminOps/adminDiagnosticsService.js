'use strict';

const fs = require('fs');
const path = require('path');
const AuditLogModel = require('../../models/auditLog');
const SosEventModel = require('../../models/sosEvent');
const FallModel = require('../../models/fall');
const locationRecordModel = require('../../models/locationRecordModel');
const aiService = require('../aiService');
const companionService = require('../companionService');
const voiceService = require('../voiceService');
const medicalApiService = require('../medicalApiService');
const ossService = require('../ossService');
const systemHealthService = require('../systemHealthService');
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
  parseDate,
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

function buildCapabilityItem(key, capability, extra = {}) {
  return {
    key,
    configured: Boolean(capability && capability.liveConfigured),
    mode: capability ? capability.requestedMode || capability.mode : 'auto',
    effectiveMode: capability ? capability.effectiveMode : 'stub',
    fallbackAllowed: Boolean(capability && capability.fallbackAllowed),
    runtimeMode: capability ? capability.runtimeMode || resolveMode() : resolveMode(),
    source: extra.source || null,
    missingConfig: Array.isArray(extra.missingConfig)
      ? extra.missingConfig
      : Array.isArray(capability && capability.missingConfig)
        ? capability.missingConfig
        : [],
    circuitOpen: Boolean(extra.circuitOpen || (capability && capability.circuitOpen)),
    notes: extra.notes || null,
  };
}

function buildIntegrationRows() {
  const aiCapability = aiService.getCapabilityReport();
  const companionCapability = companionService.getCapabilityReport();
  const voiceCapability = voiceService.getCapabilityReport();
  const ossCapability = ossService.getCapabilityReport();
  const medicalCapability =
    typeof medicalApiService.getCapabilityReport === 'function'
      ? medicalApiService.getCapabilityReport()
      : null;
  const medicalSource =
    typeof medicalApiService.getSourceTag === 'function'
      ? medicalApiService.getSourceTag()
      : 'third_party_stub';
  const wechatCapability = wechatNotifier.getCapabilityReport();
  const sosSmsCapability = smsNotifyService.getCapabilityReport();
  const sosWechatCapability = wechatNotifyService.getCapabilityReport();
  const competitionSeed = getCompetitionSeedAssetStatus();
  const runtimeMode = resolveMode();

  return [
    buildCapabilityItem('ai_consult', aiCapability),
    buildCapabilityItem('ai_companion', companionCapability),
    buildCapabilityItem('voice', voiceCapability),
    buildCapabilityItem('oss', ossCapability),
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
      runtimeMode,
    },
    {
      ...buildCapabilityItem('medical', medicalCapability, {
        source: medicalSource,
        notes:
          medicalSource === 'third_party_live'
            ? 'Medical requests currently use the live upstream integration path.'
            : 'Medical requests currently use curated dataset fallback or deterministic stub data for competition replay.',
      }),
      configured: Boolean(medicalCapability && medicalCapability.liveConfigured),
      effectiveMode:
        medicalCapability && medicalCapability.effectiveMode
          ? medicalCapability.effectiveMode
          : medicalSource === 'third_party_live'
            ? 'live'
            : 'stub',
    },
    buildCapabilityItem('wechat_notify', wechatCapability, {
      source: 'wechat_template_api',
      missingConfig: wechatCapability.missingConfig,
      notes:
        wechatCapability.effectiveMode === 'live'
          ? 'WeChat template notify currently uses the live platform API path.'
          : 'WeChat template notify currently uses deterministic mock responses for sandbox replay.',
    }),
    {
      key: 'sos_sms_notify',
      configured: sosSmsCapability.configured,
      mode: sosSmsCapability.mode,
      effectiveMode: sosSmsCapability.effectiveMode,
      fallbackAllowed: sosSmsCapability.fallbackAllowed,
      source: sosSmsCapability.source,
      missingConfig: sosSmsCapability.missingConfig,
      notes: sosSmsCapability.notes,
      runtimeMode,
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
      runtimeMode,
    },
  ].map((item) => ({
    ...item,
    configState: item.configured ? 'ready' : 'missing',
    healthy:
      item.effectiveMode === 'live' ? item.configured : item.fallbackAllowed || item.configured,
  }));
}

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(value, startDate, endDate) {
  const date = toDate(value);
  if (!date) {
    return false;
  }

  return date.getTime() >= startDate.getTime() && date.getTime() <= endDate.getTime();
}

function sortTimeline(list) {
  return list.sort((left, right) => {
    const leftTime = toDate(left.occurredAt);
    const rightTime = toDate(right.occurredAt);
    return rightTime.getTime() - leftTime.getTime();
  });
}

const adminDiagnosticsService = {
  async getIntegrationStatus() {
    const items = buildIntegrationRows();
    const readiness = await systemHealthService.getReadinessStatus();
    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      items,
      readiness,
      recentErrors: getRecentThirdPartyErrors(10),
      summary: {
        healthyCount: items.filter((item) => item.healthy).length,
        totalCount: items.length,
        readiness: readiness.ready,
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

  async getEventReplay(query = {}) {
    const userId = parsePositiveInt(query.userId, 'userId');
    const endDate = query.endDate ? parseDate(query.endDate, 'endDate') : new Date();
    const startDate = query.startDate
      ? parseDate(query.startDate, 'startDate')
      : new Date(endDate.getTime() - 48 * 60 * 60 * 1000);
    if (endDate.getTime() < startDate.getTime()) {
      throw createBizError(400, 'endDate must not be earlier than startDate.', 400);
    }

    const locationLimit = Math.min(Math.max(Number(query.locationLimit) || 200, 1), 1000);
    const auditLimit = Math.min(Math.max(Number(query.auditLimit) || 50, 1), 200);

    const [locations, sosEvents, fallEvents, auditLogs] = await Promise.all([
      locationRecordModel.getByTimeRange(userId, startDate, endDate, locationLimit),
      SosEventModel.listByUser(userId, { page: 1, pageSize: 50 }),
      FallModel.listHistory(userId, { page: 1, pageSize: 50 }),
      AuditLogModel.list({ userId }, { page: 1, pageSize: auditLimit }),
    ]);

    const filteredSos = sosEvents.filter((item) =>
      isWithinRange(item.updated_at || item.created_at, startDate, endDate)
    );
    const filteredFall = fallEvents.filter((item) =>
      isWithinRange(item.detectedAt || item.createdAt, startDate, endDate)
    );
    const filteredAudit = auditLogs.filter((item) => isWithinRange(item.createdAt, startDate, endDate));

    const timeline = sortTimeline([
      ...locations.map((item) => ({
        type: 'gps',
        occurredAt: item.createdAt,
        title: 'Location upload',
        payload: item,
      })),
      ...filteredSos.map((item) => ({
        type: 'sos',
        occurredAt: item.updated_at || item.created_at,
        title: `SOS ${item.event_status}`,
        payload: item,
      })),
      ...filteredFall.map((item) => ({
        type: 'fall',
        occurredAt: item.detectedAt || item.createdAt,
        title: `Fall ${item.status}`,
        payload: item,
      })),
      ...filteredAudit.map((item) => ({
        type: 'audit',
        occurredAt: item.createdAt,
        title: item.action,
        payload: item,
      })),
    ]);

    return {
      userId,
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        gpsPoints: locations.length,
        sosEvents: filteredSos.length,
        fallEvents: filteredFall.length,
        auditLogs: filteredAudit.length,
        totalTimelineItems: timeline.length,
      },
      recommendations: [
        filteredSos.some((item) => ['triggered', 'confirmed'].includes(item.event_status))
          ? 'There are active SOS events in the replay window. Verify resolution and caregiver follow-up.'
          : 'No active SOS event remains in the replay window.',
        filteredFall.some((item) => item.status === 'confirmed')
          ? 'Confirmed fall events exist. Review notification delivery and offline follow-up.'
          : 'No confirmed fall event exists in the replay window.',
      ],
      timeline,
    };
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
