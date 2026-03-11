'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/config/database', () => ({
  query: jest.fn().mockResolvedValue([[{ ok: 1 }], []]),
}));

jest.mock('../../src/config/redis', () => ({
  ping: jest.fn().mockResolvedValue('PONG'),
}));

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { userId: 1001 };
  next();
});

jest.mock('../../src/middleware/familyAccess', () => (req, _res, next) => {
  req.targetUserId = Number(req.query.user_id || 1001);
  next();
});

jest.mock('../../src/services/healthArchiveService', () => ({
  getToday: jest.fn(),
  getTrend: jest.fn(),
  getLatestBloodPressure: jest.fn(),
  getLatestHeartRate: jest.fn(),
}));

jest.mock('../../src/services/healthSyncService', () => ({
  sync: jest.fn(),
}));

jest.mock('../../src/services/healthManualService', () => ({
  createManualRecord: jest.fn(),
}));

jest.mock('../../src/services/deviceService', () => ({
  bind: jest.fn(),
  unbind: jest.fn(),
  list: jest.fn(),
  setPrimary: jest.fn(),
}));

const healthArchiveService = require('../../src/services/healthArchiveService');
const deviceService = require('../../src/services/deviceService');
const healthRouter = require('../../src/routes/healthRoutes');
const deviceRouter = require('../../src/routes/deviceCompat');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/device', deviceRouter);
  return app;
}

describe('health archive API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health keeps the infrastructure health check contract', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: 'Health check passed.',
      data: {
        status: 'ok',
        runtimeMode: expect.any(String),
        mysql: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
  });

  it('GET /health/today matches the published health archive path', async () => {
    healthArchiveService.getToday.mockResolvedValue({
      userId: 1001,
      date: '2026-03-11',
      metrics: {
        heart_rate: { value: '76', unit: 'bpm' },
      },
      alerts: [],
      recordsCount: 1,
    });

    const res = await request(createApp()).get('/health/today');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: 'ok',
      data: expect.objectContaining({
        userId: 1001,
        date: expect.any(String),
        metrics: expect.any(Object),
        alerts: expect.any(Array),
      }),
    });
    expect(healthArchiveService.getToday).toHaveBeenCalledWith(1001);
  });

  it('GET /device/list matches the published device path', async () => {
    deviceService.list.mockResolvedValue([
      {
        id: 11,
        deviceName: 'Smart Band',
        isPrimary: true,
        bindStatus: 'bound',
      },
    ]);

    const res = await request(createApp()).get('/device/list');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: 'ok',
      data: [
        expect.objectContaining({
          id: expect.any(Number),
          deviceName: expect.any(String),
          isPrimary: expect.any(Boolean),
          bindStatus: expect.any(String),
        }),
      ],
    });
  });
});