'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  req.user = { userId: 3003 };
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

describe('语音会话日志权限集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sessionId 非法时应返回 400', async () => {
    const app = createApp();
    const res = await request(app).get('/voice/sessions/abc/logs');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      message: 'sessionId 必须为正整数',
    });
    expect(voiceService.getSessionLogs).not.toHaveBeenCalled();
  });

  test('跨用户访问会话日志应返回 403', async () => {
    const err = new Error('无权访问该语音会话日志');
    err.code = 403;
    err.statusCode = 403;
    voiceService.getSessionLogs.mockRejectedValue(err);

    const app = createApp();
    const res = await request(app).get('/voice/sessions/9/logs');

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      code: 403,
      message: '无权访问该语音会话日志',
    });
  });
});
