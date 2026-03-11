'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/middleware/volunteerAuth', () => jest.fn());
jest.mock('../../src/services/volunteerService', () => ({
  getProfile: jest.fn(),
  getTasks: jest.fn(),
  acceptTask: jest.fn(),
  checkInTask: jest.fn(),
  checkOutTask: jest.fn(),
  completeTask: jest.fn(),
  getTraining: jest.fn(),
}));

const volunteerAuth = require('../../src/middleware/volunteerAuth');
const volunteerService = require('../../src/services/volunteerService');
const volunteerRouter = require('../../src/routes/volunteer');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/volunteer', volunteerRouter);
  return app;
}

function createToken(userId = 2001) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('volunteer routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    volunteerAuth.mockImplementation((req, _res, next) => {
      req.volunteerScope = { userId: 2001, communityId: 66, role: 'volunteer' };
      next();
    });
  });

  test('lists volunteer tasks', async () => {
    const app = buildApp();
    const token = createToken();

    volunteerService.getTasks.mockResolvedValue({
      list: [{ id: 1, status: 'pending' }],
      pagination: { page: 1, page_size: 10, total: 1 },
      summary: { available_count: 1 },
    });

    const res = await request(app)
      .get('/volunteer/tasks')
      .query({ status: 'pending', page: 1, page_size: 10 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].status).toBe('pending');
    expect(volunteerService.getTasks).toHaveBeenCalledWith(
      { userId: 2001, communityId: 66, role: 'volunteer' },
      expect.objectContaining({ status: 'pending' })
    );
  });

  test('accepts volunteer task', async () => {
    const app = buildApp();
    const token = createToken();

    volunteerService.acceptTask.mockResolvedValue({
      task_id: 2,
      status: 'assigned',
      volunteer_id: 2001,
    });

    const res = await request(app)
      .post('/volunteer/tasks/2/accept')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('assigned');
    expect(volunteerService.acceptTask).toHaveBeenCalledWith(
      { userId: 2001, communityId: 66, role: 'volunteer' },
      '2'
    );
  });

  test('rejects invalid task id before reaching service', async () => {
    const app = buildApp();
    const token = createToken();

    const res = await request(app)
      .post('/volunteer/tasks/abc/check-in')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 400,
      message: 'taskId must be a positive integer.',
    });
    expect(volunteerService.checkInTask).not.toHaveBeenCalled();
  });

  test('returns volunteer profile', async () => {
    const app = buildApp();
    const token = createToken();

    volunteerService.getProfile.mockResolvedValue({
      id: 2001,
      name: 'Alice',
      role: 'volunteer',
    });

    const res = await request(app)
      .get('/volunteer/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Alice');
  });
});
