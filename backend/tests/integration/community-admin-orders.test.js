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

function createToken(userId = 1002) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('社区管理-工单管理集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, res, next) => {
      req.adminScope = { communityId: 66, role: 'leader' };
      next();
    });
  });

  test('工单列表支持状态过滤与分页', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.getOrders.mockResolvedValue({
      list: [
        {
          id: 1,
          order_no: 'ORDER-20260221-123456',
          community_id: 66,
          status: 'pending',
        },
      ],
      pagination: { page: 1, page_size: 10, total: 1 },
    });

    const res = await request(app)
      .get('/community/orders')
      .query({ status: 'pending', page: 1, page_size: 10 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].status).toBe('pending');
    expect(communityAdminService.getOrders).toHaveBeenCalledWith(
      66,
      expect.objectContaining({ status: 'pending' })
    );
  });

  test('创建工单默认 pending 且返回唯一工单号', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.createOrder.mockResolvedValue({
      id: 11,
      order_no: 'ORDER-20260221-654321',
      community_id: 66,
      service_type: 'door_visit',
      elder_id: 9001,
      volunteer_id: null,
      status: 'pending',
      scheduled_at: '2026-02-21 10:00:00',
    });

    const res = await request(app)
      .post('/community/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        service_type: 'door_visit',
        elder_id: 9001,
        scheduled_at: '2026-02-21 10:00:00',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.order_no).toMatch(/^ORDER-\d{8}-\d{6}$/);
  });

  test('非法 status 枚举应被参数校验拦截', async () => {
    const app = buildApp();
    const token = createToken();

    const res = await request(app)
      .get('/community/orders')
      .query({ status: 'unknown' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 400, message: 'status 枚举值非法' });
    expect(communityAdminService.getOrders).not.toHaveBeenCalled();
  });
});
