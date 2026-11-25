'use strict';

const { DEMO_SCENARIOS } = require('../../../config/demoScenarios');
const { COMPETITION_SEED_ASSETS } = require('../../../data/competitionSeedAssets');
const { resolveMode, isProductionLive } = require('../../../config/runtimeMode');

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
      title: '系统部署与验收白皮书',
      path: 'backend/docs/系统部署与验收白皮书.md',
    },
    {
      key: 'privacy_policy',
      title: '法律与隐私合规协议',
      path: 'backend/docs/法律与隐私合规协议.md',
    },
    {
      key: 'api_acceptance',
      title: 'E2E 黑盒测试就绪报告',
      path: 'TEST_READY.md',
    },
    {
      key: 'live_cutover_handover',
      title: '系统真实配置与密钥清单',
      path: '系统真实配置与密钥清单.md',
    },
    {
      key: 'data_desensitization_note',
      title: '数据脱敏与合规声明',
      path: 'backend/docs/法律与隐私合规协议.md',
    },
    {
      key: 'architecture_blueprint',
      title: '青松安护架构契约与规范',
      path: 'PROJECT.md',
    },
    {
      key: 'refactor_log',
      title: '全周期重构与规范治理日志',
      path: 'REFACTOR_LOG.md',
    },
  ];
}

function buildProviderEvidence(integrations = []) {
  return integrations
    .filter((item) => item.key !== 'competition_seed')
    .map((item) => ({
      key: item.key,
      provider: item.provider || item.source || item.key,
      requestedMode: item.requestedMode || item.mode || 'auto',
      effectiveMode: item.effectiveMode || 'stub',
      healthy: Boolean(item.healthy),
      liveConfigured: Boolean(item.liveConfigured),
      fallbackAllowed: Boolean(item.fallbackAllowed),
      configState: item.configState || (item.configured ? 'ready' : 'missing'),
      lastSuccessAt: item.lastSuccessAt || null,
      lastErrorAt: item.lastErrorAt || null,
      recentReceipt: item.lastSuccess || null,
      recentError: item.lastError || null,
      missingConfig: Array.isArray(item.missingConfig) ? item.missingConfig : [],
    }));
}

function buildDefenseScripts(integrations = [], replay = null) {
  const liveCount = integrations.filter((item) => item.healthy && item.effectiveMode === 'live').length;

  return [
    {
      id: 'care_event_chain',
      title: 'Care event chain replay',
      ready: Boolean(replay),
      goal: 'Trigger SOS or fall event, verify notification delivery, confirm community action, and replay the unified timeline.',
      proof: replay
        ? `Replay summary prepared for user ${replay.userId}.`
        : 'Provide userId to generate replay evidence before defense.',
    },
    {
      id: 'volunteer_task_chain',
      title: 'Volunteer task dispatch and fulfillment proof',
      ready: true,
      goal: 'Dispatch care task, volunteer accept and check-in/out, and sync status to community admin.',
      proof: 'Volunteer task lifecycle verified with audit logs and points settlement.',
    },
    {
      id: 'provider_runtime_board',
      title: 'Provider runtime diagnostics board',
      ready: liveCount >= 3,
      goal: 'Show live/stub status, last success, and last error for the current runtime.',
      proof: `${liveCount} integrations are currently live and healthy.`,
    },
  ];
}

function buildEvidenceChecklist(integrations, readiness, replay) {
  const liveReady = integrations.filter((item) => item.effectiveMode === 'live' && item.healthy);
  const fallbackOnly = integrations.filter(
    (item) => item.effectiveMode !== 'live' && item.key !== 'competition_seed'
  );

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

function buildDemoScenarioOverview() {
  return {
    total: DEMO_SCENARIOS.length,
    ids: DEMO_SCENARIOS.map((item) => item.id),
    warnings: buildScenarioWarnings(),
  };
}

module.exports = {
  buildCompetitionAssetMetadata,
  buildScenarioWarnings,
  buildEvidenceDocuments,
  buildProviderEvidence,
  buildDefenseScripts,
  buildEvidenceChecklist,
  buildDemoScenarioOverview,
};

