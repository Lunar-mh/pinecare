'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

jest.mock('../../src/services/sosService', () => ({
  triggerSos: jest.fn(),
  cancelSos: jest.fn(),
  getHistory: jest.fn(),
  confirmSos: jest.fn(),
  resolveSos: jest.fn(),
  autoResolveTimeoutEvents: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  zremrangebyscore: jest.fn(async () => 0),
  zcard: jest.fn(async () => 0),
  zadd: jest.fn(async () => 1),
  expire: jest.fn(async () => 1),
  on: jest.fn(),
}));

jest.mock('../../src/models/user', () => ({
  findById: jest.fn(async (userId) => ({ id: userId, account_status: 'active' })),
}));

const sosService = require('../../src/services/sosService');
const sosRouter = require('../../src/routes/sos');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/sos', sosRouter);
  return app;
}

describe('SOS trigger and cancel integration', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'sos-trigger-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /sos/trigger returns 401 without token', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/sos/trigger')
      .send({ latitude: 30.1, longitude: 120.1 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  test('POST /sos/trigger returns unified success envelope', async () => {
    const app = createApp();
    const token = jwt.sign({ userId: 9001 }, process.env.JWT_SECRET || 'fallback_secret');

    sosService.triggerSos.mockResolvedValue({
      event_id: 501,
      event_status: 'triggered',
    });

    const res = await request(app)
      .post('/sos/trigger')
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: 30.1, longitude: 120.1, address: 'Demo address' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: 'SOS event created.',
      data: { event_id: 501, event_status: 'triggered' },
    });
    expect(sosService.triggerSos).toHaveBeenCalledWith(9001, {
      latitude: 30.1,
      longitude: 120.1,
      address: 'Demo address',
    });
  });

  test('POST /sos/cancel forwards business errors as 4xx', async () => {
    const app = createApp();
    const token = jwt.sign({ userId: 9001 }, process.env.JWT_SECRET || 'fallback_secret');

    const bizErr = new Error('SOS event cannot be canceled.');
    bizErr.code = 408;
    bizErr.statusCode = 408;
    sosService.cancelSos.mockRejectedValue(bizErr);

    const res = await request(app)
      .post('/sos/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({ event_id: 501 });

    expect(res.status).toBe(408);
    expect(res.body).toEqual({
      code: 408,
      message: 'SOS event cannot be canceled.',
      data: null,
    });
  });
});