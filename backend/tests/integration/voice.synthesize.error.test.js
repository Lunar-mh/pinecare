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

describe('语音合成异常集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('文本为空时应返回 400', async () => {
    const app = createApp();
    const res = await request(app).post('/voice/synthesize').send({ text: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      message: 'text 不能为空',
    });
    expect(voiceService.synthesize).not.toHaveBeenCalled();
  });

  test('上游TTS失败时应返回 502', async () => {
    const err = new Error('语音合成服务暂时不可用，请稍后重试');
    err.code = 502;
    err.statusCode = 502;
    voiceService.synthesize.mockRejectedValue(err);

    const app = createApp();
    const res = await request(app).post('/voice/synthesize').send({
      text: '请播报今日提醒。',
    });

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      code: 502,
      message: '语音合成服务暂时不可用，请稍后重试',
    });
  });
});
