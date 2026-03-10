'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/middleware/adminAuth', () => jest.fn());
jest.mock('../../src/services/communityAdminService', () => ({
  getVolunteers: jest.fn(),
  getOrders: jest.fn(),
  createOrder: jest.fn(),
  getActivities: jest.fn(),
  createActivity: jest.fn(),
  getStats: jest.fn(),
}));

const adminAuth = require('../../src/middleware/adminAuth');
const communityAdminService = require('../../src/services/communityAdminService');
const communityRouter = require('../../src/routes/community');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/community', communityRouter);
  return app;
}

function createToken(userId = 1006) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

function percentile95(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(Math.ceil(sorted.length * 0.95) - 1, 0);
  return sorted[index] || 0;
}

describe('社区统计接口性能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, res, next) => {
      req.adminScope = { communityId: 102, role: 'admin' };
      next();
    });

    communityAdminService.getStats.mockResolvedValue({
      overview: { active_elders: 120, volunteers: 45, total_orders: 380, total_service_hours: 960 },
      order_distribution: { pending: 15, assigned: 8, processing: 12, completed: 340, cancelled: 5 },
    });
  });

  test('GET /community/stats 在 50 并发下 p95 < 500ms', async () => {
    jest.setTimeout(20000);

    const app = buildApp();
    const token = createToken();
    const concurrency = 50;

    const tasks = Array.from({ length: concurrency }).map(async () => {
      const start = Date.now();
      const res = await request(app).get('/community/stats').set('Authorization', `Bearer ${token}`);
      const duration = Date.now() - start;
      return { status: res.status, duration };
    });

    const results = await Promise.all(tasks);
    const durations = results.map((r) => r.duration);
    const p95 = percentile95(durations);

    results.forEach((r) => {
      expect(r.status).toBe(200);
    });

    expect(p95).toBeLessThan(500);
  });
});
