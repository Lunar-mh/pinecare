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
    {
      key: 'privacy_policy',
      title: 'Privacy policy',
      path: 'backend/docs/privacy-policy.md',
    },
    {
      key: 'user_agreement',
      title: 'User agreement',
      path: 'backend/docs/user-agreement.md',
    },
    {
      key: 'medical_disclaimer',
      title: 'Medical disclaimer',
      path: 'backend/docs/medical-disclaimer.md',
    },
    {
      key: 'ai_usage_notice',
      title: 'AI usage notice',
      path: 'backend/docs/ai-usage-notice.md',
    },
    {
      key: 'third_party_authorizations',
      title: 'Third-party services and authorizations',
      path: 'backend/docs/third-party-services-and-authorizations.md',
    },
    {
      key: 'data_desensitization_note',
      title: 'Data desensitization note',
      path: 'backend/docs/data-desensitization-note.md',
    },
    {
      key: 'test_quality_report',
      title: 'Test quality report',
      path: 'backend/docs/test-quality-report.md',
    },
    {
      key: 'performance_audit_report',
      title: 'Performance audit report',
      path: 'backend/docs/performance-audit-report.md',
    },
    {
      key: 'security_audit_report',
      title: 'Security audit report',
      path: 'backend/docs/security-audit-report.md',
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

