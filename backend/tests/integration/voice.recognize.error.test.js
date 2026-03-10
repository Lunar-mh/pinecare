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

describe('语音识别异常集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('音频非 base64 时应返回 400', async () => {
    const app = createApp();
    const res = await request(app).post('/voice/recognize').send({
      audio: '***非法音频***',
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      message: 'audio 必须为 base64 编码字符串',
    });
    expect(voiceService.recognize).not.toHaveBeenCalled();
  });

  test('缺少唤醒词时应返回 422', async () => {
    const err = new Error('请先说出唤醒词“银伴银伴”');
    err.code = 422;
    err.statusCode = 422;
    voiceService.recognize.mockRejectedValue(err);

    const app = createApp();
    const res = await request(app).post('/voice/recognize').send({
      audio: 'UklGRnRlc3Q=',
    });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      code: 422,
      message: '请先说出唤醒词“银伴银伴”',
    });
  });
});
