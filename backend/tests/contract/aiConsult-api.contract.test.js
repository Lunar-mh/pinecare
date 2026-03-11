'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: 'Unauthorized',
      data: null,
    });
  }

  req.user = { userId: 9001 };
  return next();
});

jest.mock('../../src/middleware/rateLimiter', () => ({
  createRateLimiter: () => (req, res, next) => next(),
}));

jest.mock('../../src/services/aiService', () => ({
  chat: jest.fn().mockResolvedValue({
    reply: '建议保持规律监测，如持续不适请及时就医。',
    sessionId: 'session-001',
    tokens: 20,
    diagnostics: {
      mode: 'live',
      source: 'dashscope_live',
      fallbackUsed: false,
      reason: 'live_response',
    },
  }),
}));

jest.mock('../../src/services/voiceService', () => ({
  speechToText: jest.fn().mockResolvedValue('我最近头晕想咨询一下'),
  textToSpeech: jest.fn().mockResolvedValue(Buffer.from('voice-reply').toString('base64')),
}));

jest.mock('../../src/services/contentSafetyService', () => ({
  check: jest.fn().mockResolvedValue({
    safe: true,
    riskType: null,
    riskLevel: null,
    matchedKeyword: null,
    triage: {
      allowResponse: true,
      needsManualFollowup: false,
      recommendation: 'No additional manual follow-up is required.',
      responseSuffix: null,
    },
  }),
}));

jest.mock('../../src/models/consultRecord', () => ({
  findBySession: jest
    .fn()
    .mockResolvedValue([{ role: 'user', content: '之前的问题', created_at: '2026-03-01 10:00:00' }]),
  findByUser: jest
    .fn()
    .mockResolvedValue([{ role: 'assistant', content: '历史回复', created_at: '2026-03-01 10:01:00' }]),
}));

jest.mock('../../src/models/healthProfile', () => ({
  findByUserId: jest.fn().mockResolvedValue({
    age: 72,
    gender: 'female',
    chronicDiseases: ['高血压'],
  }),
  upsert: jest.fn().mockResolvedValue(true),
}));

const router = require('../../src/routes/aiConsult');
const aiService = require('../../src/services/aiService');
const voiceService = require('../../src/services/voiceService');
const contentSafetyService = require('../../src/services/contentSafetyService');
const ConsultRecord = require('../../src/models/consultRecord');
const HealthProfile = require('../../src/models/healthProfile');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/ai-consult', router);
  return app;
}

function expectContractShape(body) {
  expect(body).toHaveProperty('code');
  expect(body).toHaveProperty('message');
  expect(body).toHaveProperty('data');
}

describe('ai-consult API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiService.chat.mockResolvedValue({
      reply: '建议保持规律监测，如持续不适请及时就医。',
      sessionId: 'session-001',
      tokens: 20,
      diagnostics: {
        mode: 'live',
        source: 'dashscope_live',
        fallbackUsed: false,
        reason: 'live_response',
      },
    });
    voiceService.speechToText.mockResolvedValue('我最近头晕想咨询一下');
    voiceService.textToSpeech.mockResolvedValue(Buffer.from('voice-reply').toString('base64'));
    contentSafetyService.check.mockResolvedValue({
      safe: true,
      riskType: null,
      riskLevel: null,
      matchedKeyword: null,
      triage: {
        allowResponse: true,
        needsManualFollowup: false,
        recommendation: 'No additional manual follow-up is required.',
        responseSuffix: null,
      },
    });
    ConsultRecord.findBySession.mockResolvedValue([
      { role: 'user', content: '之前的问题', created_at: '2026-03-01 10:00:00' },
    ]);
    ConsultRecord.findByUser.mockResolvedValue([
      { role: 'assistant', content: '历史回复', created_at: '2026-03-01 10:01:00' },
    ]);
    HealthProfile.findByUserId.mockResolvedValue({
      age: 72,
      gender: 'female',
      chronicDiseases: ['高血压'],
    });
    HealthProfile.upsert.mockResolvedValue(true);
  });

  it('POST /ai-consult/chat returns unified response', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/ai-consult/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: '最近头晕怎么办', sessionId: 'session-001' });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toMatchObject({
      reply: expect.any(String),
      sessionId: 'session-001',
      tokens: 20,
      diagnostics: {
        mode: 'live',
        source: 'dashscope_live',
        fallbackUsed: false,
        reason: 'live_response',
      },
    });
    expect(res.body.data.safety.safe).toBe(true);
  });

  it('GET /ai-consult/history returns unified response', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/ai-consult/history')
      .set('Authorization', 'Bearer valid-token')
      .query({ limit: 10 });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
    expect(res.body.data.records).toHaveLength(1);
  });

  it('POST /ai-consult/voice returns unified response', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/ai-consult/voice')
      .set('Authorization', 'Bearer valid-token')
      .send({
        audioData: Buffer.from('voice').toString('base64'),
        sessionId: 'session-002',
      });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
    expect(res.body.data).toMatchObject({
      reply: expect.any(String),
      audioData: expect.any(String),
      sessionId: 'session-001',
      text: '我最近头晕想咨询一下',
    });
    expect(res.body.data.safety.safe).toBe(true);
  });

  it('GET /ai-consult/profile returns unified response', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/ai-consult/profile')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
    expect(res.body.data.profile).toMatchObject({
      age: 72,
      gender: 'female',
    });
  });

  it('PUT /ai-consult/profile validates payload and updates profile', async () => {
    const app = createApp();
    const res = await request(app)
      .put('/ai-consult/profile')
      .set('Authorization', 'Bearer valid-token')
      .send({
        age: 73,
        gender: 'female',
        chronicDiseases: ['高血压'],
      });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
    expect(HealthProfile.upsert).toHaveBeenCalled();
  });

  it('POST /ai-consult/chat returns 403 with safety payload when content is blocked', async () => {
    contentSafetyService.check.mockResolvedValue({
      safe: false,
      riskType: 'self_harm',
      riskLevel: 'high',
      matchedKeyword: '自杀',
      triage: {
        allowResponse: false,
        needsManualFollowup: true,
        recommendation: 'Immediately encourage offline support.',
        responseSuffix: null,
      },
    });

    const app = createApp();
    const res = await request(app)
      .post('/ai-consult/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: '危险内容', sessionId: 'session-003' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      code: 403,
      data: {
        manualFollowupSuggested: true,
        safety: {
          safe: false,
          riskType: 'self_harm',
          riskLevel: 'high',
        },
      },
    });
  });

  it('returns 401 without auth header', async () => {
    const app = createApp();
    const res = await request(app).post('/ai-consult/chat').send({ message: '你好' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: 401,
      message: 'Unauthorized',
      data: null,
    });
  });
});
