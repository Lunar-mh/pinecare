'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../src/middleware/auth', () => {
  return (req, _res, next) => {
    req.user = { userId: 0, role: 'admin', isAdmin: true };
    next();
  };
});

jest.mock('../src/services/adminUserService', () => ({
  listUsers: jest.fn(),
  getUserDetail: jest.fn(),
  createUser: jest.fn(),
  updateUserStatus: jest.fn(),
}));

const adminUsersRouter = require('../src/routes/adminUsers');
const adminUserService = require('../src/services/adminUserService');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin/users', adminUsersRouter);
  return app;
}

describe('admin users routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /admin/users returns paged users', async () => {
    adminUserService.listUsers.mockResolvedValue({
      list: [{ id: 1, nickname: 'A', phone: '13800000000', role: 'elder', status: '正常', registerDate: '2026-03-10', lastActive: '从未登录' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const app = createApp();
    const res = await request(app).get('/admin/users?page=1&pageSize=10');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(1);
    expect(adminUserService.listUsers).toHaveBeenCalledWith({ page: '1', pageSize: '10' });
  });

  it('GET /admin/users/:userId validates userId', async () => {
    const app = createApp();
    const res = await request(app).get('/admin/users/abc');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('POST /admin/users creates a user', async () => {
    adminUserService.createUser.mockResolvedValue({
      id: 99,
      nickname: 'new-user',
      phone: '13900000000',
      role: 'elder',
      status: '正常',
      registerDate: '2026-03-10',
      lastActive: '从未登录',
    });

    const app = createApp();
    const res = await request(app)
      .post('/admin/users')
      .send({ nickname: 'new-user', phone: '13900000000', role: 'elder' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(99);
  });

  it('PUT /admin/users/:userId/status validates status', async () => {
    const app = createApp();
    const res = await request(app)
      .put('/admin/users/1/status')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('PUT /admin/users/:userId/status updates status', async () => {
    adminUserService.updateUserStatus.mockResolvedValue(null);

    const app = createApp();
    const res = await request(app)
      .put('/admin/users/1/status')
      .send({ status: '禁用' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(adminUserService.updateUserStatus).toHaveBeenCalledWith(1, '禁用');
  });
});
