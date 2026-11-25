'use strict';

jest.mock('../../src/models/auditLog', () => ({
  list: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../../src/services/systemHealthService', () => ({
  getReadinessStatus: jest.fn(),
}));
jest.mock('../../src/services/adminOps/eventReplayService', () => ({
  getEventReplay: jest.fn(),
}));
jest.mock('../../src/services/adminOps/adminDiagnostics/integrationStatus', () => ({
  buildIntegrationRows: jest.fn(),
}));
jest.mock('../../src/config/demoScenarios', () => ({
  DEMO_SCENARIOS: [{ id: 'care-demo', title: 'Care Demo', checklist: ['step 1'], apiSequence: ['GET /demo'], bootstrap: { userId: 7 }, modules: ['004'] }],
  getDemoScenarioById: jest.fn((id) => (id === 'care-demo' ? { id: 'care-demo', title: 'Care Demo', checklist: ['step 1'], apiSequence: ['GET /demo'], bootstrap: { userId: 7 }, modules: ['004'] } : null)),
}));
jest.mock('../../src/utils/thirdParty', () => ({
  getRecentThirdPartyErrors: jest.fn(() => [{ provider: 'medical-api', message: 'upstream failed' }]),
}));
jest.mock('../../src/services/eventTimelineService', () => ({
  getCareEventAuditDiagnostics: jest.fn(() => ({ totalFailures: 1, recentCount: 1, items: [{ action: 'sos.triggered' }] })),
}));

const service = require('../../src/services/adminOps/adminDiagnosticsService');
const systemHealthService = require('../../src/services/systemHealthService');
const { getEventReplay } = require('../../src/services/adminOps/eventReplayService');
const { buildIntegrationRows } = require('../../src/services/adminOps/adminDiagnostics/integrationStatus');
const AuditLogModel = require('../../src/models/auditLog');

describe('adminDiagnosticsService evidence bundle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    systemHealthService.getReadinessStatus.mockResolvedValue({ ready: true, data: { status: 'ok' } });
    getEventReplay.mockResolvedValue({ userId: 7, summary: { totalTimelineItems: 5 } });
    buildIntegrationRows.mockReturnValue([
      {
        key: 'medical',
        provider: 'medical-api',
        configured: true,
        liveConfigured: true,
        requestedMode: 'live',
        effectiveMode: 'live',
        fallbackAllowed: false,
        healthy: true,
        configState: 'ready',
        lastSuccessAt: '2026-03-12T10:00:00.000Z',
        lastSuccess: { requestId: 'req-med-1', thirdPartyAppointId: 'appt-1' },
        lastErrorAt: null,
        lastError: null,
      },
      {
        key: 'wechat_notify',
        provider: 'wechat',
        configured: true,
        liveConfigured: true,
        requestedMode: 'live',
        effectiveMode: 'live',
        fallbackAllowed: false,
        healthy: true,
        configState: 'ready',
        lastSuccessAt: '2026-03-12T11:00:00.000Z',
        lastSuccess: { msgid: 'msg-1' },
      },
      {
        key: 'voice',
        provider: 'dashscope-voice',
        configured: true,
        liveConfigured: true,
        requestedMode: 'live',
        effectiveMode: 'live',
        fallbackAllowed: false,
        healthy: true,
        configState: 'ready',
        lastSuccessAt: '2026-03-12T12:00:00.000Z',
        lastSuccess: { taskId: 'task-1' },
      },
      {
        key: 'competition_seed',
        generated: true,
        sqlReady: true,
        verification: { available: true },
        effectiveMode: 'ready',
        healthy: true,
      },
    ]);
  });

  it('returns evidence bundle with provider evidence, defense scripts, and summary', async () => {
    const result = await service.getEvidenceBundle({ userId: '7' });

    expect(result.providerEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'medical', recentReceipt: { requestId: 'req-med-1', thirdPartyAppointId: 'appt-1' } }),
        expect.objectContaining({ key: 'wechat_notify', recentReceipt: { msgid: 'msg-1' } }),
      ])
    );
    expect(result.defenseScripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'care_event_chain', ready: true }),
        expect.objectContaining({ id: 'volunteer_task_chain', ready: true }),
        expect.objectContaining({ id: 'provider_runtime_board', ready: true }),
      ])
    );
    expect(result.summary).toEqual({
      liveHealthyCount: 3,
      fallbackCount: 0,
      recentErrorCount: 0,
    });
    expect(result.evidenceDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'privacy_policy' }),
        expect.objectContaining({ key: 'data_desensitization_note' }),
      ])
    );
  });

  it('boots demo scenario and writes audit log', async () => {
    AuditLogModel.create.mockResolvedValueOnce(1);

    const result = await service.bootstrapDemoScenario({ scenarioId: 'care-demo' }, { userId: 9 });

    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        action: 'admin.demo.bootstrap',
      })
    );
    expect(result).toMatchObject({ scenarioId: 'care-demo', status: 'ready' });
  });
});
