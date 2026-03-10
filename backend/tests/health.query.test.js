'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/middleware/familyAccess', () => {
  return (req, res, next) => {
    req.targetUserId = Number(req.query.user_id || 1001);
    next();
  };
});

jest.mock('../src/services/healthArchiveService', () => ({
  getToday: jest.fn(),
  getTrend: jest.fn(),
  VALID_METRIC_TYPES: ['heart_rate'],
  VALID_PERIODS: ['7d', '30d'],
}));

const healthArchiveService = require('../src/services/healthArchiveService');
const healthArchiveRouter = require('../src/routes/healthArchive');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health-archive', healthArchiveRouter);
  return app;
}

describe('健康查询接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health-archive/today 返回统一格式', async () => {
    healthArchiveService.getToday.mockResolvedValue({
      userId: 1001,
      date: '2026-02-21',
      metrics: { heart_rate: { value: '78' } },
      alerts: [],
      recordsCount: 1,
    });

    const app = createApp();
    const res = await request(app).get('/health-archive/today');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('ok');
    expect(res.body.data.userId).toBe(1001);
    expect(healthArchiveService.getToday).toHaveBeenCalledWith(1001);
  });

  it('GET /health-archive/trend 空数据场景', async () => {
    healthArchiveService.getTrend.mockResolvedValue({
      userId: 1001,
      metricType: 'heart_rate',
      period: '7d',
      list: [],
      alerts: [],
    });

    const app = createApp();
    const res = await request(app).get('/health-archive/trend?metric_type=heart_rate&period=7d');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: 'ok',
      data: {
        metricType: 'heart_rate',
        period: '7d',
        list: [],
      },
    });
  });

  it('GET /health-archive/trend 缺少参数返回业务错误', async () => {
    const app = createApp();
    const res = await request(app).get('/health-archive/trend?period=7d');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('metric_type 不能为空');
  });
});
