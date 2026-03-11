'use strict';

const loadService = () => {
  jest.resetModules();
  const existsSync = jest.fn();
  const adminOpsModel = {
    listHealthOverview: jest.fn(),
    countHealthOverview: jest.fn(),
    listMedicationLogs: jest.fn(),
    countMedicationLogs: jest.fn(),
    getMedicationLogById: jest.fn(),
    updateMedicationLogStatus: jest.fn(),
    listGpsCurrent: jest.fn(),
    countGpsCurrent: jest.fn(),
    listGpsTrail: jest.fn(),
    listFamilyBindings: jest.fn(),
    countFamilyBindings: jest.fn(),
    listMedicalReports: jest.fn(),
    countMedicalReports: jest.fn(),
    listSosEvents: jest.fn(),
    countSosEvents: jest.fn(),
    summarizeSosNotifications: jest.fn(),
    getSosEventById: jest.fn(),
    updateSosEventStatus: jest.fn(),
    listFallEvents: jest.fn(),
    countFallEvents: jest.fn(),
    listDrugInteractions: jest.fn(),
    getDrugInteractionById: jest.fn(),
    updateDrugInteractionStatus: jest.fn(),
    listTimeBankServiceHistory: jest.fn(),
    countTimeBankServiceHistory: jest.fn(),
    getTimeBankServiceRecordById: jest.fn(),
    listTimeBankExchangeHistory: jest.fn(),
    listTimeBankLeaderboard: jest.fn(),
  };
  const AuditLogModel = { list: jest.fn(), count: jest.fn(), create: jest.fn() };
  const timeBankModel = { settleServiceRecord: jest.fn() };
  const aiService = { getCapabilityReport: jest.fn(() => ({ liveConfigured: true, requestedMode: 'auto', effectiveMode: 'stub', fallbackAllowed: true })) };
  const companionService = { getCapabilityReport: jest.fn(() => ({ liveConfigured: false, requestedMode: 'auto', effectiveMode: 'stub', fallbackAllowed: true })) };
  const voiceService = { getCapabilityReport: jest.fn(() => ({ liveConfigured: false, requestedMode: 'auto', effectiveMode: 'mock', fallbackAllowed: true })) };
  const medicalApiService = {
    getCapabilityReport: jest.fn(() => ({ liveConfigured: false, mode: 'auto', effectiveMode: 'stub', fallbackAllowed: true, missingConfig: ['MEDICAL_API_KEY'], circuitOpen: false })),
    getSourceTag: jest.fn(() => 'stub'),
  };
  const ossService = { getCapabilityReport: jest.fn(() => ({ liveConfigured: true, requestedMode: 'live', effectiveMode: 'live', fallbackAllowed: false })) };
  const wechatNotifier = { getCapabilityReport: jest.fn(() => ({ liveConfigured: false, requestedMode: 'auto', effectiveMode: 'mock', fallbackAllowed: true, missingConfig: ['WECHAT_APP_ID'] })) };
  const smsNotifyService = { getCapabilityReport: jest.fn(() => ({ configured: true, mode: 'live', effectiveMode: 'live', fallbackAllowed: false, source: 'aliyun_sms', missingConfig: [], notes: 'ok', healthy: true })) };
  const wechatNotifyService = { getCapabilityReport: jest.fn(() => ({ configured: true, mode: 'live', effectiveMode: 'live', fallbackAllowed: false, source: 'wechat_subscribe_message', missingConfig: [], notes: 'ok', healthy: true })) };
  const systemHealthService = { getReadinessStatus: jest.fn(async () => ({ ready: true, data: { status: 'ok' } })) };
  const runtimeMode = { resolveMode: jest.fn(() => 'COMPETITION_SANDBOX'), isProductionLive: jest.fn(() => false) };
  const thirdParty = { getRecentThirdPartyErrors: jest.fn(() => [{ code: '503' }]) };
  const DEMO_SCENARIOS = [{ id: 'demo-1', title: 'Demo One', bootstrap: { tables: 1 }, modules: ['medical'], apiSequence: ['/a', '/b'], checklist: ['step1'] }];
  const getDemoScenarioById = jest.fn((id) => DEMO_SCENARIOS.find((item) => item.id === id) || null);

  jest.doMock('fs', () => ({ existsSync }));
  jest.doMock('../../src/models/adminOpsModel', () => adminOpsModel);
  jest.doMock('../../src/models/auditLog', () => AuditLogModel);
  jest.doMock('../../src/models/timeBank', () => timeBankModel);
  jest.doMock('../../src/services/aiService', () => aiService);
  jest.doMock('../../src/services/companionService', () => companionService);
  jest.doMock('../../src/services/voiceService', () => voiceService);
  jest.doMock('../../src/services/medicalApiService', () => medicalApiService);
  jest.doMock('../../src/services/ossService', () => ossService);
  jest.doMock('../../src/services/systemHealthService', () => systemHealthService);
  jest.doMock('../../src/config/demoScenarios', () => ({ DEMO_SCENARIOS, getDemoScenarioById }));
  jest.doMock('../../src/data/competitionSeedManifest', () => ({ COMPETITION_SEED_MANIFEST: { coverage: 'baseline' } }));
  jest.doMock('../../src/data/competitionSeedAssets', () => ({ COMPETITION_SEED_ASSETS: { outputDir: 'generated/competition-seed', files: { bootstrapSql: 'bootstrap.sql', summary: 'summary.json', bootstrapSummary: 'bootstrap-summary.json' }, commands: ['npm run seed'] } }));
  jest.doMock('../../src/config/runtimeMode', () => runtimeMode);
  jest.doMock('../../src/utils/thirdParty', () => thirdParty);
  jest.doMock('../../src/utils/wechatNotifier', () => wechatNotifier);
  jest.doMock('../../src/services/smsNotifyService', () => smsNotifyService);
  jest.doMock('../../src/services/wechatNotifyService', () => wechatNotifyService);

  const service = require('../../src/services/adminOpsService');
  return { service, existsSync, adminOpsModel, AuditLogModel, timeBankModel, getDemoScenarioById, systemHealthService };
};

describe('adminOpsService', () => {
  it('maps health, medication, gps, family, and medical admin views', async () => {
    let loaded = loadService();
    loaded.adminOpsModel.listHealthOverview.mockResolvedValueOnce([{ user_id: 1, nickname: 'Alice', phone: '138', age: 70, bp_systolic: 165, bp_diastolic: 101, heart_rate: 50, blood_sugar: 12, last_update: '2026-03-11T10:00:00.000Z' }]);
    loaded.adminOpsModel.countHealthOverview.mockResolvedValueOnce(1);
    await expect(loaded.service.getHealthOverview({ page: '1', pageSize: '10', search: 'alice', communityId: '9' })).resolves.toMatchObject({
      list: [expect.objectContaining({ userId: 1, riskLevel: 'danger', bloodPressure: '165/101' })],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    loaded = loadService();
    loaded.adminOpsModel.listHealthOverview.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ER_NO_SUCH_TABLE' }));
    loaded.adminOpsModel.countHealthOverview.mockResolvedValueOnce(0);
    await expect(loaded.service.getHealthOverview({})).resolves.toEqual({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    loaded = loadService();
    loaded.adminOpsModel.listMedicationLogs.mockResolvedValueOnce([{ id: 3, user_id: 1, nickname: 'Alice', phone: '138', plan_id: 7, medication_name: 'Drug', dosage: '1 pill', scheduled_time: '2026-03-11T09:00:00.000Z', actual_time: null, status: 'pending', reminder_sent: 1, second_reminder_sent: 0, family_notified: 0 }]);
    loaded.adminOpsModel.countMedicationLogs.mockResolvedValueOnce(1);
    await expect(loaded.service.getMedicationLogs({ status: 'pending', startDate: '2026-03-01', endDate: '2026-03-31' })).resolves.toMatchObject({
      list: [expect.objectContaining({ id: 3, medicationName: 'Drug', reminderSent: 1 })],
      pagination: { total: 1 },
    });

    loaded = loadService();
    loaded.adminOpsModel.listGpsCurrent.mockResolvedValueOnce([{ id: 5, user_id: 1, nickname: 'Alice', phone: '138', age: 70, latitude: '30.1', longitude: '120.1', accuracy: '10', location_type: 'gps', created_at: '2026-03-11T09:00:00.000Z' }]);
    loaded.adminOpsModel.countGpsCurrent.mockResolvedValueOnce(1);
    loaded.adminOpsModel.listGpsTrail.mockResolvedValueOnce([{ id: 6, user_id: 1, latitude: '30.1', longitude: '120.1', accuracy: '8', location_type: 'gps', created_at: '2026-03-11T09:00:00.000Z' }]);
    loaded.adminOpsModel.listFamilyBindings.mockResolvedValueOnce([{ id: 9, elder_id: 1, family_id: 2, status: 'active', binding_created_at: '2026-03-11', elder_nickname: 'Elder', elder_name: 'A', elder_avatar: null, elder_gender: 'female', elder_age: 70, health_archive_id: 11, health_updated_at: '2026-03-11' }]);
    loaded.adminOpsModel.countFamilyBindings.mockResolvedValueOnce(1);
    loaded.adminOpsModel.listMedicalReports.mockResolvedValueOnce([{ id: 7, user_id: 1, nickname: 'Alice', phone: '138', report_no: 'R1', report_type: 'exam', report_date: '2026-03-10', report_url: null, report_data: { ok: true }, sync_status: 'synced', created_at: '2026-03-11' }]);
    loaded.adminOpsModel.countMedicalReports.mockResolvedValueOnce(1);
    await expect(loaded.service.getGpsCurrent({})).resolves.toMatchObject({ list: [expect.objectContaining({ id: 5, latitude: 30.1 })] });
    await expect(loaded.service.getGpsTrail({ userId: '1', startDate: '2026-03-11', endDate: '2026-03-12' })).resolves.toMatchObject({ total: 1, list: [expect.objectContaining({ id: 6 })] });
    await expect(loaded.service.getFamilyBindings({})).resolves.toMatchObject({ list: [expect.objectContaining({ bindingId: 9 })] });
    await expect(loaded.service.getMedicalReports({})).resolves.toMatchObject({ source: 'admin', list: [expect.objectContaining({ id: 7 })] });
  });

  it('handles medication, sos, fall, and interaction transitions', async () => {
    let loaded = loadService();
    await expect(loaded.service.getMedicationLogs({ status: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.getGpsTrail({ userId: '1', startDate: '2026-03-12', endDate: '2026-03-11' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.getMedicalReports({ startDate: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.getSosEvents({ status: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.getFallEvents({ status: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.getDrugInteractions({ status: 'bad' })).rejects.toMatchObject({ code: 400 });

    loaded = loadService();
    loaded.adminOpsModel.getMedicationLogById.mockResolvedValueOnce({ id: 3, status: 'pending' }).mockResolvedValueOnce({ id: 3, status: 'taken', actual_time: '2026-03-11T09:10:00.000Z' });
    loaded.adminOpsModel.updateMedicationLogStatus.mockResolvedValueOnce(1);
    await expect(loaded.service.updateMedicationLogStatus(3, { status: 'taken' })).resolves.toMatchObject({ id: 3, status: 'taken' });

    loaded = loadService();
    loaded.adminOpsModel.listSosEvents.mockResolvedValueOnce([{ id: 8, user_id: 1, nickname: 'Alice', phone: '138', event_status: 'triggered', trigger_type: 'manual', latitude: 30.1, longitude: 120.1, address: 'Addr', created_at: 'c', confirmed_at: null, resolved_at: null, cancelled_at: null }]);
    loaded.adminOpsModel.countSosEvents.mockResolvedValueOnce(1);
    loaded.adminOpsModel.summarizeSosNotifications.mockResolvedValueOnce([{ sos_event_id: 8, notify_type: 'wechat', pending_count: 0, sent_count: 1, failed_count: 0 }]);
    await expect(loaded.service.getSosEvents({ status: 'triggered' })).resolves.toMatchObject({ list: [expect.objectContaining({ event_id: 8, notification_summary: expect.any(Object) })] });

    loaded = loadService();
    loaded.adminOpsModel.getSosEventById.mockResolvedValueOnce({ id: 8, event_status: 'triggered' });
    loaded.adminOpsModel.updateSosEventStatus.mockResolvedValueOnce(1);
    await expect(loaded.service.updateSosEventStatus(8, { status: 'confirmed' })).resolves.toEqual({ event_id: 8, event_status: 'confirmed' });

    loaded = loadService();
    loaded.adminOpsModel.listFallEvents.mockResolvedValueOnce([{ id: 5, user_id: 1, nickname: 'Alice', phone: '138', status: 'confirmed', sensor_data: '{"peak":1}', sensitivity: 'high', detected_at: 'd', cancelled_at: null, confirmed_at: 'c', created_at: 'x' }]);
    loaded.adminOpsModel.countFallEvents.mockResolvedValueOnce(1);
    await expect(loaded.service.getFallEvents({ status: 'confirmed' })).resolves.toMatchObject({ list: [expect.objectContaining({ id: 5, sensorData: { peak: 1 } })] });

    loaded = loadService();
    loaded.adminOpsModel.listDrugInteractions.mockResolvedValueOnce([{ id: 9, user_id: 1, nickname: 'Alice', phone: '138', drug_a: 'A', drug_b: 'B', level: 'high', mechanism: null, risk_description: null, suggestion: null, status: 'pending', check_batch_id: 'batch', created_at: 'c' }]);
    loaded.adminOpsModel.getDrugInteractionById.mockResolvedValueOnce({ id: 9, status: 'pending' });
    loaded.adminOpsModel.updateDrugInteractionStatus.mockResolvedValueOnce(1);
    await expect(loaded.service.getDrugInteractions({ status: 'pending' })).resolves.toEqual([expect.objectContaining({ id: 9, mechanism: '', riskDescription: '' })]);
    await expect(loaded.service.updateDrugInteractionStatus(9, { status: 'acknowledged' })).resolves.toEqual({ id: 9, status: 'acknowledged' });
  });

  it('handles time bank views, diagnostics, audit logs, and demo scenarios', async () => {
    let loaded = loadService();
    loaded.adminOpsModel.listTimeBankServiceHistory.mockResolvedValueOnce([{ id: 1, provider_id: 7, provider_nickname: 'P', recipient_id: 8, recipient_nickname: 'R', service_type: 'escort', start_time: 's', end_time: 'e', duration_hours: '1', time_coins: '2', status: 'pending', created_at: 'c' }]);
    loaded.adminOpsModel.countTimeBankServiceHistory.mockResolvedValueOnce(1);
    loaded.adminOpsModel.getTimeBankServiceRecordById.mockResolvedValueOnce({ id: 1, status: 'pending' });
    await expect(loaded.service.getTimeBankServiceHistory({ status: 'pending' })).resolves.toMatchObject({ list: [expect.objectContaining({ id: 1, providerId: 7 })] });

    loaded = loadService();
    loaded.adminOpsModel.getTimeBankServiceRecordById.mockResolvedValueOnce({ id: 1, status: 'pending' });
    await expect(loaded.service.confirmTimeBankService({ recordId: 1, action: 'confirm' })).resolves.toEqual({ recordId: 1, status: 'confirmed' });

    loaded = loadService();
    loaded.adminOpsModel.listTimeBankExchangeHistory.mockResolvedValueOnce([{ id: 2, user_id: 7, exchange_type: 'gift', item_name: 'Coupon', coins_required: '5', status: 'completed', created_at: 'c', completed_at: 'd' }]);
    loaded.adminOpsModel.listTimeBankLeaderboard.mockResolvedValueOnce([{ user_id: 7, balance: '5', total_earned: '10', credit_score: '80', credit_level: 'gold' }]);
    loaded.AuditLogModel.list.mockResolvedValueOnce([{ id: 1 }]);
    loaded.AuditLogModel.count.mockResolvedValueOnce(1);
    await expect(loaded.service.getTimeBankExchangeHistory({})).resolves.toEqual([expect.objectContaining({ id: 2, userId: 7 })]);
    await expect(loaded.service.getTimeBankLeaderboard({})).resolves.toEqual([expect.objectContaining({ rank: 1, userId: 7 })]);
    await expect(loaded.service.getAuditLogs({ page: '1', pageSize: '20' })).resolves.toEqual({
      list: [{ id: 1 }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    loaded = loadService();
    loaded.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(false);
    loaded.AuditLogModel.create.mockResolvedValueOnce(1);
    await expect(loaded.service.getIntegrationStatus()).resolves.toMatchObject({
      summary: { totalCount: 9, readiness: true },
      recentErrors: [{ code: '503' }],
    });
    await expect(loaded.service.getDemoScenarios()).resolves.toMatchObject({ scenarios: [expect.objectContaining({ id: 'demo-1', order: 1 })] });
    await expect(loaded.service.bootstrapDemoScenario({ scenarioId: 'demo-1' }, { userId: 7 })).resolves.toMatchObject({ scenarioId: 'demo-1', status: 'ready' });
  });

  it('surfaces invalid or missing admin ops transitions', async () => {
    const loaded = loadService();
    await expect(loaded.service.updateMedicationLogStatus(1, { status: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.updateDrugInteractionStatus(1, { status: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.getTimeBankServiceHistory({ status: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.confirmTimeBankService({ recordId: 1, action: 'bad' })).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.bootstrapDemoScenario({})).rejects.toMatchObject({ code: 400 });
    await expect(loaded.service.bootstrapDemoScenario({ scenarioId: 'missing' })).rejects.toMatchObject({ code: 404 });
  });
});
