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

describe('语音会话列表集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /voice/sessions 应返回分页会话列表（按时间倒序）', async () => {
    voiceService.getSessions.mockResolvedValue({
      list: [
        { id: 12, user_id: 3003, round_count: 3, created_at: '2026-02-21 12:00:00' },
        { id: 11, user_id: 3003, round_count: 1, created_at: '2026-02-20 09:00:00' },
      ],
      pagination: { page: 1, pageSize: 2, total: 2, totalPages: 1 },
    });

    const app = createApp();
    const res = await request(app).get('/voice/sessions').query({ page: 1, pageSize: 2 });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('语音会话查询成功');
    expect(res.body.data.list[0].id).toBe(12);
    expect(res.body.data.list[1].id).toBe(11);
    expect(voiceService.getSessions).toHaveBeenCalledWith(3003, {
      page: '1',
      pageSize: '2',
    });
  });
});
