'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/services/medicationSettingService', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

const medicationSettingService = require('../src/services/medicationSettingService');
const medicationSettingRoutes = require('../src/routes/medicationSettingRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/medication/settings', medicationSettingRoutes);
  return app;
}

describe('用药提醒设置接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /medication/settings 返回默认设置', async () => {
    medicationSettingService.getSettings.mockResolvedValue({
      user_id: 1001,
      reminder_enabled: 1,
      family_sync_enabled: 0,
      sleep_start: '22:00:00',
      sleep_end: '06:00:00',
    });

    const app = createApp();
    const res = await request(app).get('/medication/settings');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('获取提醒设置成功');
    expect(res.body.data.reminder_enabled).toBe(1);
  });

  it('PUT /medication/settings 更新设置成功', async () => {
    medicationSettingService.updateSettings.mockResolvedValue({
      user_id: 1001,
      reminder_enabled: 1,
      family_sync_enabled: 1,
      sleep_start: '23:00:00',
      sleep_end: '06:30:00',
    });

    const app = createApp();
    const res = await request(app).put('/medication/settings').send({
      family_sync_enabled: 1,
      sleep_start: '23:00',
      sleep_end: '06:30',
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('更新提醒设置成功');
    expect(res.body.data.family_sync_enabled).toBe(1);
  });
});
