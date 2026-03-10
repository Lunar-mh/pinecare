'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 7001 };
    next();
  };
});

jest.mock('../../src/services/familyService', () => ({
  getFamilyBindings: jest.fn(),
  getElderHealth: jest.fn(),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
}));

const familyService = require('../../src/services/familyService');
const familyRouter = require('../../src/routes/family');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/family', familyRouter);
  return app;
}

describe('family 路由集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /family/bindings 成功返回统一响应结构', async () => {
    familyService.getFamilyBindings.mockResolvedValue([{ elderId: 9001 }]);

    const app = createApp();
    const res = await request(app).get('/family/bindings');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('成功');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /family/health/:elderId 在参数非法时返回 422', async () => {
    const app = createApp();
    const res = await request(app).get('/family/health/not-number');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe(422);
    expect(res.body.message).toBe('elderId 必须为正整数');
  });

  it('GET /family/settings 成功返回通知设置', async () => {
    familyService.getNotificationSettings.mockResolvedValue({
      userId: 7001,
      healthAlertEnabled: true,
      medicationReminderEnabled: true,
      sosAlertEnabled: false,
    });

    const app = createApp();
    const res = await request(app).get('/family/settings');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('成功');
    expect(res.body.data.userId).toBe(7001);
  });

  it('PUT /family/settings 成功更新通知设置', async () => {
    familyService.updateNotificationSettings.mockResolvedValue({
      userId: 7001,
      healthAlertEnabled: false,
      medicationReminderEnabled: true,
      sosAlertEnabled: true,
    });

    const app = createApp();
    const res = await request(app)
      .put('/family/settings')
      .send({ healthAlertEnabled: false });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('成功');
    expect(res.body.data.healthAlertEnabled).toBe(false);
  });
});
