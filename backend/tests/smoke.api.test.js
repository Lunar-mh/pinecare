'use strict';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../src/config/redis', () => ({
  ping: jest.fn(),
}));

const { query } = require('../src/config/database');
const redis = require('../src/config/redis');
const auth = require('../src/middleware/auth');
const healthRoutes = require('../src/routes/healthRoutes');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/protected', auth, (req, res) => {
    res.json({ code: 0, message: '鉴权通过', data: { userId: req.user.userId } });
  });

  app.use('/health', healthRoutes);

  return app;
}

describe('后端 smoke 测试', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'smoke-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('未携带 token 访问受保护接口返回 401', async () => {
    const app = createApp();
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  it('携带有效 token 访问受保护接口成功', async () => {
    const token = jwt.sign({ userId: 1001 }, process.env.JWT_SECRET);

    const app = createApp();
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, message: '鉴权通过', data: { userId: 1001 } });
  });

  it('健康检查接口返回统一格式', async () => {
    query.mockResolvedValue([[{ ok: 1 }]]);
    redis.ping.mockResolvedValue('PONG');

    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('健康检查通过');
    expect(res.body.data.mysql).toBe('正常');
    expect(res.body.data.redis).toBe('正常');
  });
});
