'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/middleware/auth', () =>
  jest.fn((req, _res, next) => {
    req.user = { userId: 2001 };
    next();
  })
);
jest.mock('../../src/middleware/volunteerAuth', () =>
  jest.fn((req, _res, next) => {
    req.volunteerScope = { userId: 2001, communityId: 66, role: 'volunteer' };
    next();
  })
);
jest.mock('../../src/services/volunteerService', () => ({
  getProfile: jest.fn(),
  getTasks: jest.fn(),
  acceptTask: jest.fn(),
  checkInTask: jest.fn(),
  checkOutTask: jest.fn(),
  completeTask: jest.fn(),
  getTraining: jest.fn(),
}));

const volunteerService = require('../../src/services/volunteerService');
const volunteerRouter = require('../../src/routes/volunteer');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/volunteer', volunteerRouter);
  return app;
}

function createToken(userId = 2001) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('volunteer API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    volunteerService.completeTask.mockResolvedValue({
      task_id: 9,
      status: 'completed',
      completed_at: '2026-03-11 10:30:00',
      settlement: {
        serviceRecord: {
          recordId: 501,
          recordHash: 'hash-501',
          prevHash: 'hash-500',
          status: 'confirmed',
          timeCoins: 2,
        },
        account: {
          balance: 18,
          totalEarned: 20,
        },
      },
    });
  });

  it('POST /volunteer/tasks/:taskId/complete returns settlement as canonical contract', async () => {
    const res = await request(createApp())
      .post('/volunteer/tasks/9/complete')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: 'success',
      data: {
        task_id: 9,
        status: 'completed',
        completed_at: '2026-03-11 10:30:00',
        settlement: {
          serviceRecord: {
            recordId: 501,
            recordHash: 'hash-501',
            prevHash: 'hash-500',
            status: 'confirmed',
            timeCoins: 2,
          },
          account: {
            balance: 18,
            totalEarned: 20,
          },
        },
      },
    });
  });
});
