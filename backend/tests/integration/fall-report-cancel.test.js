'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../../src/services/fallService', () => ({
  reportFall: jest.fn(),
  cancelFall: jest.fn(),
  getFallHistory: jest.fn(),
  getFallSettings: jest.fn(),
  updateFallSettings: jest.fn(),
  startCountdownWorker: jest.fn(),
  stopCountdownWorker: jest.fn(),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  createRateLimiter: () => (req, res, next) => next(),
}));

const fallService = require('../../src/services/fallService');
const router = require('../../src/routes/fallDetection');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/fall-detection', router);
  return app;
}

describe('跌倒上报与取消集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /fall-detection/report 应返回 detecting 结果', async () => {
    fallService.reportFall.mockResolvedValue({
      detected: true,
      countdownSeconds: 15,
      event: { id: 11, status: 'detecting' },
    });

    const app = createApp();
    const res = await request(app)
      .post('/fall-detection/report')
      .send({ sensorData: { verticalPeak: 3.5, horizontalChangeRate: 2.2 } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: 'success',
      data: {
        detected: true,
        countdownSeconds: 15,
      },
    });
    expect(fallService.reportFall).toHaveBeenCalledWith(1001, {
      verticalPeak: 3.5,
      horizontalChangeRate: 2.2,
    });
  });

  it('POST /fall-detection/cancel 应完成 detecting -> cancelled', async () => {
    fallService.cancelFall.mockResolvedValue({
      cancelled: true,
      event: { id: 11, status: 'cancelled' },
    });

    const app = createApp();
    const res = await request(app).post('/fall-detection/cancel').send({ eventId: 11 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: 'success',
      data: {
        cancelled: true,
        event: { id: 11, status: 'cancelled' },
      },
    });
    expect(fallService.cancelFall).toHaveBeenCalledWith(1001, 11);
  });
});
