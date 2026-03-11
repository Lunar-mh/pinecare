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

jest.mock('../../src/services/deviceService', () => ({
  bind: jest.fn(),
  unbind: jest.fn(),
  list: jest.fn(),
  setPrimary: jest.fn(),
}));

jest.mock('../../src/services/familyService', () => ({
  getFamilyBindings: jest.fn(),
  getElderlyOverview: jest.fn(),
  getElderHealth: jest.fn(),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
}));

jest.mock('../../src/services/familySpaceService', () => ({
  sendMessage: jest.fn(),
  listMessages: jest.fn(),
  uploadAlbum: jest.fn(),
  listAlbum: jest.fn(),
  getPoints: jest.fn(),
  getLeaderboard: jest.fn(),
}));

const healthArchiveService = require('../../src/services/healthArchiveService');
const deviceService = require('../../src/services/deviceService');
const familySpaceService = require('../../src/services/familySpaceService');
const healthRouter = require('../../src/routes/healthRoutes');
const healthArchiveRouter = require('../../src/routes/healthArchive');
const deviceRouter = require('../../src/routes/deviceCompat');
const familyRouter = require('../../src/routes/family');
const familySpaceRouter = require('../../src/routes/familySpace');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health', healthRouter);
  app.use('/health-archive', healthArchiveRouter);
  app.use('/device', deviceRouter);
  app.use('/family', familyRouter);
  app.use('/family-space', familySpaceRouter);
  return app;
}

function expectDeprecatedHeaders(res, successorPath) {
  expect(res.headers.deprecation).toBe('true');
  expect(res.headers.sunset).toBeTruthy();
  expect(res.headers.warning).toContain('Deprecated API');
  expect(res.headers.link).toContain(successorPath);
}

describe('canonical and compatibility route parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps /health-archive/today compatible with /health/today', async () => {
    healthArchiveService.getToday.mockResolvedValue({
      userId: 1001,
      date: '2026-03-11',
      metrics: { heart_rate: { value: '77' } },
      alerts: [],
      recordsCount: 1,
    });

    const app = createApp();
    const canonical = await request(app).get('/health/today');
    const compat = await request(app).get('/health-archive/today');

    expect(canonical.status).toBe(200);
    expect(compat.status).toBe(200);
    expect(compat.body).toEqual(canonical.body);
    expectDeprecatedHeaders(compat, '/health/today');
  });

  it('keeps /health-archive/device/list compatible with /device/list', async () => {
    deviceService.list.mockResolvedValue([
      { id: 1, deviceName: 'Band A', isPrimary: true, bindStatus: 'bound' },
    ]);

    const app = createApp();
    const canonical = await request(app).get('/device/list');
    const compat = await request(app).get('/health-archive/device/list');

    expect(canonical.status).toBe(200);
    expect(compat.status).toBe(200);
    expect(compat.body).toEqual(canonical.body);
    expectDeprecatedHeaders(compat, '/device/list');
  });

  it('keeps /family-space/points compatible with /family/points', async () => {
    familySpaceService.getPoints.mockResolvedValue({
      totalPoints: 12,
      details: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    });

    const app = createApp();
    const canonical = await request(app).get('/family/points?page=1&pageSize=10');
    const compat = await request(app).get('/family-space/points?page=1&pageSize=10');

    expect(canonical.status).toBe(200);
    expect(compat.status).toBe(200);
    expect(compat.body).toEqual(canonical.body);
    expectDeprecatedHeaders(compat, '/family/points');
  });
});
