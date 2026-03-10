'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1002 };
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

const fallService = require('../../src/services/fallService');
const router = require('../../src/routes/fallDetection');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/fall-detection', router);
  return app;
}

describe('跌倒历史查询集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /fall-detection/history 应返回分页数据', async () => {
    fallService.getFallHistory.mockResolvedValue({
      list: [{ id: 1, status: 'confirmed' }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    const app = createApp();
    const res = await request(app)
      .get('/fall-detection/history')
      .query({ page: 1, pageSize: 10, status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: 'success',
      data: {
        list: [{ id: 1, status: 'confirmed' }],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      },
    });
    expect(fallService.getFallHistory).toHaveBeenCalledWith(1002, {
      page: '1',
      pageSize: '10',
      status: 'confirmed',
    });
  });
});
