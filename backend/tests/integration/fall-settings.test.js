'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1003 };
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

describe('灵敏度设置集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /fall-detection/settings 应读取设置', async () => {
    fallService.getFallSettings.mockResolvedValue({ sensitivity: 'medium', updatedAt: null });

    const app = createApp();
    const res = await request(app).get('/fall-detection/settings');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: 'success',
      data: { sensitivity: 'medium' },
    });
    expect(fallService.getFallSettings).toHaveBeenCalledWith(1003);
  });

  it('PUT /fall-detection/settings 应更新设置', async () => {
    fallService.updateFallSettings.mockResolvedValue({
      sensitivity: 'high',
      updatedAt: '2026-02-21 08:00:00',
    });

    const app = createApp();
    const res = await request(app).put('/fall-detection/settings').send({ sensitivity: 'high' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      code: 0,
      message: 'success',
      data: { sensitivity: 'high' },
    });
    expect(fallService.updateFallSettings).toHaveBeenCalledWith(1003, 'high');
  });

  it('PUT /fall-detection/settings 缺少 sensitivity 应报错', async () => {
    const app = createApp();
    const res = await request(app).put('/fall-detection/settings').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: 400,
      message: 'sensitivity 不能为空',
      data: null,
    });
  });
});
