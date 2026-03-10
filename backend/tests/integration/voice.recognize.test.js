'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  req.user = { userId: 1001 };
  next();
});

jest.mock('../../src/services/voiceInteractionService', () => ({
  recognize: jest.fn(),
  synthesize: jest.fn(),
  getSessions: jest.fn(),
  getSessionLogs: jest.fn(),
}));

const voiceService = require('../../src/services/voiceInteractionService');
const voiceRouter = require('../../src/routes/voice');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/voice', voiceRouter);
  return app;
}

describe('语音识别接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /voice/recognize 识别成功并返回结果', async () => {
    voiceService.recognize.mockResolvedValue({
      sessionId: 88,
      recognizedText: '银伴银伴 帮我查询今天步数',
      wakeWord: '银伴银伴',
      roundCount: 1,
    });

    const app = createApp();
    const res = await request(app).post('/voice/recognize').send({
      audio: 'UklGRnRlc3Q=',
      sessionId: 88,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: '语音识别成功',
      data: {
        sessionId: 88,
        wakeWord: '银伴银伴',
      },
    });
    expect(voiceService.recognize).toHaveBeenCalledWith(1001, {
      audioData: 'UklGRnRlc3Q=',
      sessionId: 88,
    });
  });
});
