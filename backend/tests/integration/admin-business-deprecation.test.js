'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  ping: jest.fn().mockResolvedValue('PONG'),
  on: jest.fn(),
}));

jest.mock('../../src/controllers/adminOpsController', () => ({
  healthOverview: jest.fn((_req, res) =>
    res.json({
      code: 0,
      message: 'ok',
      data: { list: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
    })
  ),
  medicationLogs: jest.fn(),
  updateMedicationLogStatus: jest.fn(),
  gpsCurrent: jest.fn(),
  gpsTrail: jest.fn(),
  familyBindings: jest.fn(),
  medicalReports: jest.fn((_req, res) =>
    res.json({
      code: 0,
      message: 'ok',
      data: {
        source: 'admin',
        list: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      },
    })
  ),
  sosEvents: jest.fn(),
  updateSosEventStatus: jest.fn(),
  fallEvents: jest.fn(),
  drugInteractions: jest.fn(),
  updateDrugInteractionStatus: jest.fn(),
  timeBankServiceHistory: jest.fn(),
  confirmTimeBankService: jest.fn(),
  timeBankExchangeHistory: jest.fn(),
  timeBankLeaderboard: jest.fn((_req, res) =>
    res.json({
      code: 0,
      message: 'ok',
      data: [{ rank: 1, userId: 7, balance: 18 }],
    })
  ),
  integrationStatus: jest.fn(),
  auditLogs: jest.fn(),
  eventReplay: jest.fn(),
  demoScenarios: jest.fn(),
  demoBootstrap: jest.fn(),
}));

jest.mock('../../src/controllers/statisticsController', () => ({
  overview: jest.fn((_req, res) =>
    res.json({
      code: 0,
      message: 'ok',
      data: { overview: { active_elders: 1 } },
    })
  ),
  activities: jest.fn((_req, res) =>
    res.json({
      code: 0,
      message: 'ok',
      data: { list: [] },
    })
  ),
}));

const app = require('../../src/app');

function createAdminToken() {
  return jwt.sign({ userId: 9, role: 'admin', isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

function expectDeprecatedHeaders(res, successorPath) {
  expect(res.headers.deprecation).toBe('true');
  expect(res.headers.sunset).toBeTruthy();
  expect(res.headers.warning).toContain('Deprecated API');
  expect(res.headers.link).toContain(successorPath);
}

describe('deprecated admin business routes', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'admin-business-deprecation-secret';
  });

  test('GET /admin/health/overview keeps working with deprecation headers', async () => {
    const res = await request(app)
      .get('/admin/health/overview')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expectDeprecatedHeaders(res, '/community/health/overview');
  });

  test('GET /admin/medical/reports keeps working with deprecation headers', async () => {
    const res = await request(app)
      .get('/admin/medical/reports')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expectDeprecatedHeaders(res, '/community/medical/reports');
  });

  test('GET /admin/time-bank/leaderboard keeps working with deprecation headers', async () => {
    const res = await request(app)
      .get('/admin/time-bank/leaderboard')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expectDeprecatedHeaders(res, '/community/time-bank/leaderboard');
  });

  test('GET /statistics/overview keeps working with deprecation headers', async () => {
    const res = await request(app)
      .get('/statistics/overview')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expectDeprecatedHeaders(res, '/community/stats');
  });
});
