'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/systemHealthService', () => ({
  getHealthStatus: jest.fn().mockResolvedValue({
    healthy: true,
    data: {
      status: 'ok',
      runtimeMode: 'COMPETITION_SANDBOX',
      serverRole: 'api',
      mysql: { status: 'ok' },
      redis: { status: 'ok' },
    },
  }),
  getLivenessStatus: jest.fn(() => ({
    status: 'ok',
    runtimeMode: 'COMPETITION_SANDBOX',
    serverRole: 'api',
  })),
  getReadinessStatus: jest.fn().mockResolvedValue({
    ready: true,
    data: {
      status: 'ok',
      runtimeMode: 'COMPETITION_SANDBOX',
      serverRole: 'api',
      mysql: { status: 'ok' },
      redis: { status: 'ok' },
    },
  }),
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

const systemHealthService = require('../../src/services/systemHealthService');
const healthArchiveService = require('../../src/services/healthArchiveService');
const deviceService = require('../../src/services/deviceService');
const healthRouter = require('../../src/routes/healthRoutes');
const systemHealthRoutes = require('../../src/routes/systemHealthRoutes');
const deviceRouter = require('../../src/routes/deviceCompat');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(systemHealthRoutes);
  app.use('/health', healthRouter);
  app.use('/device', deviceRouter);
  return app;
}

describe('health archive API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    systemHealthService.getHealthStatus.mockResolvedValue({
      healthy: true,
      data: {
        status: 'ok',
        runtimeMode: 'COMPETITION_SANDBOX',
        serverRole: 'api',
        mysql: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
    systemHealthService.getReadinessStatus.mockResolvedValue({
      ready: true,
      data: {
        status: 'ok',
        runtimeMode: 'COMPETITION_SANDBOX',
        serverRole: 'api',
        mysql: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
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
        serverRole: expect.any(String),
        mysql: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
  });

  it('GET /livez and /readyz expose explicit probe contracts', async () => {
    const livez = await request(createApp()).get('/livez');
    const readyz = await request(createApp()).get('/readyz');

    expect(livez.status).toBe(200);
    expect(livez.body).toEqual({
      code: 0,
      message: 'Liveness check passed.',
      data: {
        status: 'ok',
        runtimeMode: expect.any(String),
        serverRole: expect.any(String),
      },
    });

    expect(readyz.status).toBe(200);
    expect(readyz.body).toEqual({
      code: 0,
      message: 'Readiness check passed.',
      data: {
        status: 'ok',
        runtimeMode: expect.any(String),
        serverRole: expect.any(String),
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
