'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => {
  return (req, _res, next) => {
    req.user = { userId: 7001 };
    next();
  };
});

jest.mock('../../src/services/familyService', () => ({
  getFamilyBindings: jest.fn(),
  getElderlyOverview: jest.fn(),
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

describe('family route integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /family/bindings returns the unified envelope', async () => {
    familyService.getFamilyBindings.mockResolvedValue([{ elderId: 9001 }]);

    const app = createApp();
    const res = await request(app).get('/family/bindings');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /family/elderly-overview returns the frozen overview contract', async () => {
    familyService.getElderlyOverview.mockResolvedValue({
      elderProfile: {
        elderId: 3001,
        familyId: 3001,
        name: 'Wang Ayi',
        avatarUrl: null,
        isOnline: true,
        lastActiveAt: '2026-03-11T09:10:00.000Z',
      },
      todayHealthSummary: {
        bloodPressure: null,
        heartRate: null,
        updatedAt: '2026-03-11T09:00:00.000Z',
      },
      medicationSummary: {
        totalTasks: 2,
        completedTasks: 1,
        pendingTasks: 1,
        skippedTasks: 0,
        missedTasks: 0,
        progress: 50,
        updatedAt: '2026-03-11T09:00:00.000Z',
      },
      locationSummary: {
        hasLocation: true,
        latitude: 30.1,
        longitude: 120.1,
        address: 'Hangzhou Xihu',
        updatedAt: '2026-03-11T09:05:00.000Z',
      },
      alerts: [],
      interactionEvidenceSummary: {
        familyId: 3001,
        voiceMessageCount: 1,
        albumCount: 2,
        pointRecordCount: 3,
        hasInteractionEvidence: true,
        lastInteractionAt: '2026-03-11T09:06:00.000Z',
      },
    });

    const app = createApp();
    const res = await request(app).get('/family/elderly-overview').query({ elderId: 3001 });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('elderProfile');
    expect(res.body.data).toHaveProperty('todayHealthSummary');
    expect(res.body.data).toHaveProperty('medicationSummary');
    expect(res.body.data).toHaveProperty('locationSummary');
    expect(res.body.data).toHaveProperty('alerts');
    expect(res.body.data).toHaveProperty('interactionEvidenceSummary');
    expect(familyService.getElderlyOverview).toHaveBeenCalledWith(7001, { elderId: '3001' });
  });

  it('GET /family/health/:elderId returns 422 for invalid params', async () => {
    const app = createApp();
    const res = await request(app).get('/family/health/not-number');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe(422);
  });

  it('GET /family/settings returns notification settings', async () => {
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
    expect(res.body.data.userId).toBe(7001);
  });

  it('PUT /family/settings updates notification settings', async () => {
    familyService.updateNotificationSettings.mockResolvedValue({
      userId: 7001,
      healthAlertEnabled: false,
      medicationReminderEnabled: true,
      sosAlertEnabled: true,
    });

    const app = createApp();
    const res = await request(app).put('/family/settings').send({ healthAlertEnabled: false });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.healthAlertEnabled).toBe(false);
  });
});
