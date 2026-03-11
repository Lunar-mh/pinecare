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
    res.json({ code: 0, message: 'auth passed', data: { userId: req.user.userId } });
  });

  app.use('/health', healthRoutes);

  return app;
}

describe('backend smoke tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'smoke-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when protected route is missing token', async () => {
    const app = createApp();
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  it('allows access with a valid bearer token', async () => {
    const token = jwt.sign({ userId: 1001 }, process.env.JWT_SECRET);

    const app = createApp();
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 0, message: 'auth passed', data: { userId: 1001 } });
  });

  it('returns the unified health envelope', async () => {
    query.mockResolvedValue([[{ ok: 1 }]]);
    redis.ping.mockResolvedValue('PONG');

    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('Health check passed.');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.mysql.status).toBe('ok');
    expect(res.body.data.redis.status).toBe('ok');
  });
});
