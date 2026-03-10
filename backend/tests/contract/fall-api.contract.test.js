'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        data: null,
      });
    }
    req.user = { userId: 9001 };
    return next();
  };
});

jest.mock('../../src/services/fallService', () => ({
  reportFall: jest.fn().mockResolvedValue({ detected: true, event: { id: 1, status: 'detecting' } }),
  cancelFall: jest.fn().mockResolvedValue({ cancelled: true, event: { id: 1, status: 'cancelled' } }),
  getFallHistory: jest.fn().mockResolvedValue({
    list: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  }),
  getFallSettings: jest.fn().mockResolvedValue({ sensitivity: 'medium', updatedAt: null }),
  updateFallSettings: jest.fn().mockResolvedValue({ sensitivity: 'high', updatedAt: null }),
  startCountdownWorker: jest.fn(),
  stopCountdownWorker: jest.fn(),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  createRateLimiter: () => (req, res, next) => next(),
}));

const router = require('../../src/routes/fallDetection');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/fall-detection', router);
  return app;
}

function expectContractShape(body) {
  expect(body).toHaveProperty('code');
  expect(body).toHaveProperty('message');
  expect(body).toHaveProperty('data');
}

describe('跌倒检测 API 契约测试', () => {
  it('POST /fall-detection/report 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/fall-detection/report')
      .set('Authorization', 'Bearer valid-token')
      .send({ sensorData: { verticalPeak: 3.2, horizontalChangeRate: 2.2 } });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('POST /fall-detection/cancel 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/fall-detection/cancel')
      .set('Authorization', 'Bearer valid-token')
      .send({ eventId: 1 });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /fall-detection/history 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/fall-detection/history')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /fall-detection/settings 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/fall-detection/settings')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('PUT /fall-detection/settings 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .put('/fall-detection/settings')
      .set('Authorization', 'Bearer valid-token')
      .send({ sensitivity: 'high' });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('缺少鉴权头时返回 401', async () => {
    const app = createApp();
    const res = await request(app).get('/fall-detection/history');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: 401,
      message: '未提供认证令牌',
      data: null,
    });
  });
});
