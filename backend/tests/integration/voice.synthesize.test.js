'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  req.user = { userId: 2002 };
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

describe('语音合成接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /voice/synthesize 合成成功并返回音频', async () => {
    voiceService.synthesize.mockResolvedValue({
      sessionId: 99,
      text: '今天天气晴朗，适合散步。',
      audioData: 'QVVESU9fQkFTRTY0',
      audioFormat: 'mp3',
      roundCount: 3,
    });

    const app = createApp();
    const res = await request(app).post('/voice/synthesize').send({
      text: '今天天气晴朗，适合散步。',
      sessionId: 99,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: '语音合成成功',
      data: {
        sessionId: 99,
        audioFormat: 'mp3',
      },
    });
    expect(typeof res.body.data.audioData).toBe('string');
  });
});
