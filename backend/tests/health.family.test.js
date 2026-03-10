'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 2001 };
    next();
  };
});

jest.mock('../src/middleware/familyAccess', () => {
  return async (req, res, next) => {
    const target = Number(req.query.user_id || 2001);
    if (target === 3001) {
      return res.status(403).json({ code: 403, message: '无权访问该用户健康数据', data: null });
    }
    req.targetUserId = target;
    return next();
  };
});

jest.mock('../src/services/healthArchiveService', () => ({
  getToday: jest.fn(),
  getTrend: jest.fn(),
}));

const healthArchiveService = require('../src/services/healthArchiveService');
const healthArchiveRouter = require('../src/routes/healthArchive');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health-archive', healthArchiveRouter);
  return app;
}

describe('家属访问鉴权集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('有关系时可查询老人今日数据', async () => {
    healthArchiveService.getToday.mockResolvedValue({ userId: 2002, metrics: {}, alerts: [] });

    const app = createApp();
    const res = await request(app).get('/health-archive/today?user_id=2002');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(healthArchiveService.getToday).toHaveBeenCalledWith(2002);
  });

  it('无关系访问返回 403', async () => {
    const app = createApp();
    const res = await request(app).get('/health-archive/today?user_id=3001');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('无权访问该用户健康数据');
  });
});
