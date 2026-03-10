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

function createToken(userId = 1004) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('社区管理-统计看板集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, res, next) => {
      req.adminScope = { communityId: 99, role: 'admin' };
      next();
    });
  });

  test('统计接口返回字段完整性与聚合结构', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.getStats.mockResolvedValue({
      overview: {
        active_elders: 120,
        volunteers: 45,
        total_orders: 380,
        total_service_hours: 960,
      },
      order_distribution: {
        pending: 15,
        assigned: 8,
        processing: 12,
        completed: 340,
        cancelled: 5,
      },
    });

    const res = await request(app)
      .get('/community/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('overview');
    expect(res.body.data).toHaveProperty('order_distribution');
    expect(res.body.data.overview).toMatchObject({
      active_elders: 120,
      volunteers: 45,
      total_orders: 380,
      total_service_hours: 960,
    });
  });

  test('admin 权限不足时应返回 403', async () => {
    const app = buildApp();
    const token = createToken();

    adminAuth.mockImplementationOnce((req, res) => {
      res.status(403).json({ code: 403, message: '无社区管理权限', data: null });
    });

    const res = await request(app)
      .get('/community/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
  });
});
