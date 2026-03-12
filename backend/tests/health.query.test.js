'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, _res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/middleware/familyAccess', () => {
  return (req, _res, next) => {
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

describe('health archive query routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health-archive/today returns unified snapshot payload', async () => {
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
    expect(res.body.message).toBe('Health overview loaded.');
    expect(res.body.data.userId).toBe(1001);
    expect(healthArchiveService.getToday).toHaveBeenCalledWith(1001);
  });

  it('GET /health-archive/trend forwards validated query values', async () => {
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
      message: 'Health trend loaded.',
      data: {
        metricType: 'heart_rate',
        period: '7d',
        list: [],
      },
    });
  });

  it('GET /health-archive/trend rejects missing metric_type before controller logic', async () => {
    const app = createApp();
    const res = await request(app).get('/health-archive/trend?period=7d');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('metric_type is required.');
    expect(healthArchiveService.getTrend).not.toHaveBeenCalled();
  });
});
