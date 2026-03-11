'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { userId: 7, role: 'admin', isAdmin: true };
  next();
});

jest.mock('../../src/middleware/adminAuth', () => (req, _res, next) => {
  req.adminScope = { communityId: 66, role: 'admin' };
  next();
});

jest.mock('../../src/middleware/rateLimiter', () => ({
  createRateLimiter: () => (_req, _res, next) => next(),
}));

jest.mock('../../src/middleware/sosValidator', () => ({
  validateTrigger: (_req, _res, next) => next(),
  validateEventId: (_req, _res, next) => next(),
  validateHistoryQuery: (_req, _res, next) => next(),
}));

jest.mock('../../src/services/contentSafetyService', () => ({
  check: jest.fn(),
}));

jest.mock('../../src/services/aiService', () => ({
  chat: jest.fn(),
}));

jest.mock('../../src/services/voiceService', () => ({
  speechToText: jest.fn(),
  textToSpeech: jest.fn(),
}));

jest.mock('../../src/models/consultRecord', () => ({
  findBySession: jest.fn(),
  findByUser: jest.fn(),
}));

jest.mock('../../src/models/healthProfile', () => ({
  findByUserId: jest.fn(),
  upsert: jest.fn(),
}));

jest.mock('../../src/services/onlineConsultationService', () => ({
  start: jest.fn(),
  listByUser: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock('../../src/services/medicalReportService', () => ({
  list: jest.fn(),
}));

jest.mock('../../src/services/sosService', () => ({
  triggerSos: jest.fn(),
  cancelSos: jest.fn(),
  getHistory: jest.fn(),
  confirmSos: jest.fn(),
  resolveSos: jest.fn(),
}));

jest.mock('../../src/services/adminOpsService', () => ({
  getAuditLogs: jest.fn(),
  getIntegrationStatus: jest.fn(),
  getEventReplay: jest.fn(),
  getDemoScenarios: jest.fn(),
  bootstrapDemoScenario: jest.fn(),
  getHealthOverview: jest.fn(),
  getMedicationLogs: jest.fn(),
  updateMedicationLogStatus: jest.fn(),
  getGpsCurrent: jest.fn(),
  getGpsTrail: jest.fn(),
  getFamilyBindings: jest.fn(),
  getMedicalReports: jest.fn(),
  getSosEvents: jest.fn(),
  updateSosEventStatus: jest.fn(),
  getFallEvents: jest.fn(),
  getDrugInteractions: jest.fn(),
  updateDrugInteractionStatus: jest.fn(),
  getTimeBankServiceHistory: jest.fn(),
  confirmTimeBankService: jest.fn(),
  getTimeBankExchangeHistory: jest.fn(),
  getTimeBankLeaderboard: jest.fn(),
}));

const contentSafetyService = require('../../src/services/contentSafetyService');
const aiService = require('../../src/services/aiService');
const voiceService = require('../../src/services/voiceService');
const onlineConsultationService = require('../../src/services/onlineConsultationService');
const medicalReportService = require('../../src/services/medicalReportService');
const sosService = require('../../src/services/sosService');
const adminOpsService = require('../../src/services/adminOpsService');
const aiConsultRouter = require('../../src/routes/aiConsult');
const medicalRouter = require('../../src/routes/medicalIntegration');
const sosRouter = require('../../src/routes/sos');
const adminOpsRouter = require('../../src/routes/adminOps');

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/ai-consult', aiConsultRouter);
  app.use('/medical', medicalRouter);
  app.use('/sos', sosRouter);
  app.use('/admin', adminOpsRouter);
  return app;
}

describe('competition acceptance chains', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('covers voice consult chain with live diagnostics and reply audio', async () => {
    contentSafetyService.check.mockResolvedValue({
      safe: true,
      riskType: null,
      riskLevel: 'low',
      matchedKeyword: null,
      triage: {
        allowResponse: true,
        needsManualFollowup: false,
        recommendation: 'No additional manual follow-up is required.',
        responseSuffix: 'If symptoms worsen, seek in-person care.',
      },
    });
    voiceService.speechToText.mockResolvedValue('我最近头晕，想咨询一下');
    aiService.chat.mockResolvedValue({
      reply: '这是一次实时语音咨询回复',
      sessionId: 'voice-session-1',
      tokens: 28,
      diagnostics: {
        mode: 'live',
        source: 'dashscope_live',
        fallbackUsed: false,
        reason: 'live_response',
      },
    });
    voiceService.textToSpeech.mockResolvedValue(Buffer.from('voice-reply').toString('base64'));

    const res = await request(createApp())
      .post('/ai-consult/voice')
      .send({ audioData: Buffer.from('voice-input').toString('base64') });

    expect(res.status).toBe(200);
    expect(res.body.data.text).toBe('我最近头晕，想咨询一下');
    expect(res.body.data.audioData).toBe(Buffer.from('voice-reply').toString('base64'));
    expect(res.body.data.diagnostics).toMatchObject({
      mode: 'live',
      source: 'dashscope_live',
      fallbackUsed: false,
    });
    expect(res.body.data.reply).toContain('If symptoms worsen, seek in-person care.');
  });

  it('covers medical consult and report chains with stub/live diagnostics', async () => {
    onlineConsultationService.start.mockResolvedValue({
      consultationId: 31,
      consultStatus: 'queued',
      diagnostics: {
        source: 'third_party_stub',
        mode: 'stub',
        fallbackUsed: true,
        reason: 'public_dataset_fallback',
      },
    });
    medicalReportService.list.mockResolvedValue({
      list: [{ id: 1, reportNo: 'R-001' }],
      total: 1,
      page: 1,
      pageSize: 10,
      diagnostics: {
        source: 'third_party_live',
        mode: 'live',
        fallbackUsed: false,
        reason: 'live_response',
      },
    });

    const consultRes = await request(createApp())
      .post('/medical/consult/start')
      .send({ doctorId: 21, department: 'geriatrics' });
    const reportsRes = await request(createApp())
      .get('/medical/reports?page=1&pageSize=10');

    expect(consultRes.status).toBe(200);
    expect(consultRes.body.data.diagnostics).toMatchObject({
      source: 'third_party_stub',
      fallbackUsed: true,
    });
    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.data.list).toHaveLength(1);
    expect(reportsRes.body.data.diagnostics).toMatchObject({
      source: 'third_party_live',
      fallbackUsed: false,
    });
  });

  it('covers sos notification trigger and admin audit query chain', async () => {
    sosService.triggerSos.mockResolvedValue({
      event_id: 88,
      event_status: 'triggered',
      notification_summary: {
        total: { pending: 0, sent: 2, failed: 0 },
      },
      diagnostics: {
        source: 'external_webhook',
        mode: 'webhook',
        fallbackUsed: false,
      },
    });
    adminOpsService.getAuditLogs.mockResolvedValue({
      list: [
        {
          id: 9001,
          action: 'sos.triggered',
          details: { entityType: 'sos', status: 'triggered' },
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    const triggerRes = await request(createApp())
      .post('/sos/trigger')
      .send({ latitude: 30.1, longitude: 120.1, address: 'West Lake' });
    const auditRes = await request(createApp())
      .get('/admin/system/audit-logs?page=1&pageSize=20&action=sos.triggered');

    expect(triggerRes.status).toBe(200);
    expect(triggerRes.body.data.notification_summary.total.sent).toBe(2);
    expect(triggerRes.body.data.diagnostics).toMatchObject({
      source: 'external_webhook',
      mode: 'webhook',
      fallbackUsed: false,
    });
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.list[0]).toMatchObject({
      action: 'sos.triggered',
      details: { entityType: 'sos', status: 'triggered' },
    });
  });
});
