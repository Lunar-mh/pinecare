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

const { query } = require('../../src/config/database');
const app = require('../../src/app');

function createAdminToken() {
  return jwt.sign(
    { userId: 0, role: 'admin', isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('admin users smoke (full route stack)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'admin-users-smoke-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/admin/users returns list and pagination', async () => {
    query
      .mockResolvedValueOnce([[
        {
          id: 1,
          nickname: 'Alice',
          phone: '13800000000',
          age: 70,
          account_status: 'active',
          created_at: '2026-03-10 10:00:00',
          last_login_at: '2026-03-10 11:00:00',
          user_role: 'elder',
        },
      ]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/users?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(1);
    expect(Array.isArray(res.body.data.list)).toBe(true);
    expect(res.body.data.list[0].nickname).toBe('Alice');
  });

  it('GET /api/v1/admin/users/:id returns detail', async () => {
    query.mockResolvedValueOnce([[
      {
        id: 2,
        nickname: 'Bob',
        phone: '13900000000',
        age: 65,
        account_status: 'active',
        created_at: '2026-03-10 10:00:00',
        last_login_at: null,
        user_role: 'family',
      },
    ]]);

    const res = await request(app)
      .get('/api/v1/admin/users/2')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(2);
  });

  it('POST /api/v1/admin/users creates user', async () => {
    query
      .mockResolvedValueOnce([{ insertId: 101 }])
      .mockResolvedValueOnce([[
        {
          id: 101,
          nickname: 'NewUser',
          phone: '13700000000',
          age: null,
          account_status: 'active',
          created_at: '2026-03-10 10:00:00',
          last_login_at: null,
          user_role: 'elder',
        },
      ]]);

    const res = await request(app)
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${createAdminToken()}`)
      .send({ nickname: 'NewUser', phone: '13700000000', role: 'elder' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(101);
  });

  it('PUT /api/v1/admin/users/:id/status updates status', async () => {
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .put('/api/v1/admin/users/101/status')
      .set('Authorization', `Bearer ${createAdminToken()}`)
      .send({ status: '禁用' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });
});
