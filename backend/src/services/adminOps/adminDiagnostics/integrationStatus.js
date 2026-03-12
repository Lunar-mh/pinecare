'use strict';

const fs = require('fs');
const path = require('path');
const aiService = require('../../aiService');
const companionService = require('../../companionService');
const voiceService = require('../../voiceService');
const medicalApiService = require('../../medicalApiService');
const ossService = require('../../ossService');
const { COMPETITION_SEED_ASSETS } = require('../../../data/competitionSeedAssets');
const { resolveMode } = require('../../../config/runtimeMode');
const wechatNotifier = require('../../../utils/wechatNotifier');
const smsNotifyService = require('../../smsNotifyService');
const wechatNotifyService = require('../../wechatNotifyService');

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function getCompetitionSeedAssetStatus() {
  const outputDir = path.join(__dirname, '..', '..', '..', '..', 'generated', 'competition-seed');
  const bootstrapSqlPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSql);
  const summaryPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.summary);
  const bootstrapSummaryPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSummary);
  const latestVerificationPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.latestVerification);
  const latestSnapshotPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.latestSnapshot);
  const latestRefreshReportPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.latestRefreshReport);

  const latestVerification = safeReadJson(latestVerificationPath);
  const latestSnapshot = safeReadJson(latestSnapshotPath);
  const latestRefreshReport = safeReadJson(latestRefreshReportPath);

  return {
    outputDir: COMPETITION_SEED_ASSETS.outputDir,
    generated: fs.existsSync(summaryPath) || fs.existsSync(bootstrapSummaryPath),
    sqlReady: fs.existsSync(bootstrapSqlPath),
    files: COMPETITION_SEED_ASSETS.files,
    commands: COMPETITION_SEED_ASSETS.commands,
    verification: {
      available: Boolean(latestVerification),
      status: latestVerification && latestVerification.status ? latestVerification.status : 'missing',
      verifiedAt: latestVerification && latestVerification.verifiedAt ? latestVerification.verifiedAt : null,
      tableChecks:
        latestVerification && Array.isArray(latestVerification.tableResults)
          ? latestVerification.tableResults.length
          : 0,
      chainChecks:
        latestVerification && Array.isArray(latestVerification.chainResults)
          ? latestVerification.chainResults.length
          : 0,
    },
    snapshot: {
      available: Boolean(latestSnapshot),
      generatedAt: latestSnapshot && latestSnapshot.generatedAt ? latestSnapshot.generatedAt : null,
    },
    refreshReport: {
      available: Boolean(latestRefreshReport),
      generatedAt:
        latestRefreshReport && latestRefreshReport.generatedAt
          ? latestRefreshReport.generatedAt
          : null,
    },
  };
}

function resolveCapabilitySource(key, capability) {
  const effectiveMode = capability ? capability.effectiveMode : 'stub';
  if (key === 'ai_consult') {
    return effectiveMode === 'live' ? 'dashscope_live' : 'ai_consult_stub';
  }
  if (key === 'ai_companion') {
    return effectiveMode === 'live' ? 'ai_companion_live' : 'ai_companion_stub';
  }
  if (key === 'voice') {
    return effectiveMode === 'live' ? 'voice_live' : 'voice_stub';
  }
  if (key === 'oss') {
    return effectiveMode === 'live' ? 'oss_live' : 'oss_stub';
  }
  return null;
}

function buildCapabilityItem(key, capability, extra = {}) {
  const merged = {
    ...(capability || {}),
    ...extra,
  };

  return {
    key,
    configured: merged.configured !== undefined ? Boolean(merged.configured) : Boolean(merged.liveConfigured),
    liveConfigured: merged.liveConfigured !== undefined ? Boolean(merged.liveConfigured) : Boolean(merged.configured),
    mode: merged.requestedMode || merged.mode || 'auto',
    requestedMode: merged.requestedMode || merged.mode || 'auto',
    effectiveMode: merged.effectiveMode || 'stub',
    fallbackAllowed: Boolean(merged.fallbackAllowed),
    runtimeMode: merged.runtimeMode || resolveMode(),
    source: merged.source || resolveCapabilitySource(key, merged),
    missingConfig: Array.isArray(merged.missingConfig) ? merged.missingConfig : [],
    circuitOpen: Boolean(merged.circuitOpen),
    notes: merged.notes || null,
    provider: merged.provider || null,
    lastSuccessAt: merged.lastSuccessAt || null,
    lastSuccess: merged.lastSuccess || null,
    successCount: Number(merged.successCount || 0),
    lastErrorAt: merged.lastErrorAt || null,
    lastError: merged.lastError || null,
    errorCount: Number(merged.errorCount || 0),
    lastOutcome: merged.lastOutcome || null,
  };
}

function buildCompetitionSeedNotes(competitionSeed) {
  if (competitionSeed.verification.available && competitionSeed.verification.status === 'verified') {
    return 'Competition seed SQL, verification report, and defense snapshot are ready for replay and judging.';
  }

  if (competitionSeed.sqlReady && competitionSeed.verification.available) {
    return `Competition seed SQL is ready and the latest verification status is ${competitionSeed.verification.status}.`;
  }

  if (competitionSeed.generated) {
    return 'Competition seed JSON assets exist, but bootstrap SQL or verification evidence is still incomplete.';
  }

  return 'Competition seed assets have not been generated in this workspace yet.';
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
      liveConfigured: competitionSeed.generated,
      mode: 'local',
      requestedMode: 'local',
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
      verification: competitionSeed.verification,
      snapshot: competitionSeed.snapshot,
      refreshReport: competitionSeed.refreshReport,
      assetFiles: competitionSeed.files,
      commands: competitionSeed.commands,
      notes: buildCompetitionSeedNotes(competitionSeed),
      runtimeMode,
      provider: null,
      lastSuccessAt: competitionSeed.verification.verifiedAt || null,
      lastSuccess: competitionSeed.verification.available ? competitionSeed.verification : null,
      successCount: competitionSeed.verification.available ? 1 : 0,
      lastErrorAt: null,
      lastError: null,
      errorCount: 0,
      lastOutcome: competitionSeed.verification.available ? 'success' : null,
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
    buildCapabilityItem('sos_sms_notify', sosSmsCapability),
    buildCapabilityItem('sos_wechat_notify', sosWechatCapability),
  ].map((item) => ({
    ...item,
    configState: item.configured ? 'ready' : 'missing',
    healthy:
      item.key === 'competition_seed'
        ? Boolean(item.generated && item.sqlReady && item.verification.available)
        : item.effectiveMode === 'live'
          ? item.configured
          : item.fallbackAllowed || item.configured,
  }));
}

module.exports = {
  buildIntegrationRows,
};
