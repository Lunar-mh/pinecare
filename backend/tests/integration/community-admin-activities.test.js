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

function createToken(userId = 1003) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('社区管理-活动管理集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, res, next) => {
      req.adminScope = { communityId: 77, role: 'admin' };
      next();
    });
  });

  test('活动列表按社区作用域返回数据', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.getActivities.mockResolvedValue({
      list: [
        {
          id: 1,
          community_id: 77,
          title: '义诊活动',
          start_time: '2026-03-01 09:00:00',
          end_time: '2026-03-01 11:00:00',
        },
      ],
      pagination: { page: 1, page_size: 10, total: 1 },
    });

    const res = await request(app)
      .get('/community/activities')
      .query({ page: 1, page_size: 10 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].community_id).toBe(77);
  });

  test('活动发布时间区间非法时应返回 400', async () => {
    const app = buildApp();
    const token = createToken();

    const res = await request(app)
      .post('/community/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '健康讲座',
        content: '慢病管理知识普及',
        start_time: '2026-03-01 18:00:00',
        end_time: '2026-03-01 10:00:00',
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 400, message: 'start_time 必须早于 end_time' });
  });

  test('创建活动成功返回统一响应结构', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.createActivity.mockResolvedValue({
      id: 9,
      community_id: 77,
      title: '春季义剪',
      content: '社区便民服务',
      start_time: '2026-03-02 09:00:00',
      end_time: '2026-03-02 12:00:00',
      max_participants: 80,
      registered_count: 0,
    });

    const res = await request(app)
      .post('/community/activities')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '春季义剪',
        content: '社区便民服务',
        start_time: '2026-03-02 09:00:00',
        end_time: '2026-03-02 12:00:00',
        max_participants: 80,
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ code: 0, message: 'success' });
    expect(communityAdminService.createActivity).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ title: '春季义剪' })
    );
  });
});
