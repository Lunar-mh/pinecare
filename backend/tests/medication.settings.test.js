'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, _res, next) => {
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

describe('medication settings routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /medication/settings returns current settings', async () => {
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
    expect(res.body.message).toBe('Medication settings loaded.');
    expect(res.body.data.reminder_enabled).toBe(1);
  });

  it('PUT /medication/settings updates settings successfully', async () => {
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
    expect(res.body.message).toBe('Medication settings updated.');
    expect(res.body.data.family_sync_enabled).toBe(1);
  });
});
