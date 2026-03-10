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

function createToken(userId = 1001) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('社区管理-志愿者列表集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, res, next) => {
      req.adminScope = { communityId: 88, role: 'admin' };
      next();
    });
  });

  test('未携带 JWT 时应返回 401', async () => {
    const app = buildApp();

    const res = await request(app).get('/community/volunteers');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 401 });
  });

  test('admin 角色可按社区和分页获取志愿者列表', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.getVolunteers.mockResolvedValue({
      list: [
        {
          user_id: 3001,
          community_id: 88,
          role: 'volunteer',
          name: '张三',
          phone: '13800000001',
        },
      ],
      pagination: { page: 2, page_size: 5, total: 12 },
    });

    const res = await request(app)
      .get('/community/volunteers')
      .query({ page: 2, page_size: 5, keyword: '张' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 0, message: 'success' });
    expect(res.body.data.list).toHaveLength(1);
    expect(communityAdminService.getVolunteers).toHaveBeenCalledWith(
      88,
      expect.objectContaining({ page: '2', page_size: '5', keyword: '张' })
    );
  });

  test('非管理角色应被 adminAuth 拦截', async () => {
    const app = buildApp();
    const token = createToken();

    adminAuth.mockImplementationOnce((req, res) => {
      res.status(403).json({ code: 403, message: '无社区管理权限', data: null });
    });

    const res = await request(app)
      .get('/community/volunteers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ code: 403, message: '无社区管理权限', data: null });
  });
});
