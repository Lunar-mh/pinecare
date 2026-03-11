'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { userId: 1001 };
  next();
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

describe('family API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /family/elderly-overview matches the frozen contract shape', async () => {
    familyService.getElderlyOverview.mockResolvedValue({
      elderProfile: {
        elderId: 3001,
        familyId: 3001,
        name: 'Wang Ayi',
        nickname: 'Ayi',
        realName: 'Wang Ayi',
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
      alerts: [
        {
          id: 'sos-88',
          type: 'sos',
          title: 'SOS request is active',
          message: 'Manual SOS request · Hangzhou Wenyi Road',
          status: 'triggered',
          createdAt: '2026-03-11T09:10:00.000Z',
          latestStatusChangedAt: '2026-03-11T09:10:00.000Z',
          notificationSummary: null,
          auditTrailSummary: {
            currentStatus: 'triggered',
            triggeredAt: '2026-03-11T09:10:00.000Z',
            confirmedAt: null,
            resolvedAt: null,
            cancelledAt: null,
          },
          isRead: false,
        },
      ],
      interactionEvidenceSummary: {
        familyId: 3001,
        voiceMessageCount: 1,
        albumCount: 2,
        pointRecordCount: 3,
        hasInteractionEvidence: true,
        lastInteractionAt: '2026-03-11T09:06:00.000Z',
      },
    });

    const res = await request(createApp()).get('/family/elderly-overview?elderId=3001');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: expect.any(String),
      data: {
        elderProfile: expect.objectContaining({
          elderId: expect.any(Number),
          familyId: expect.any(Number),
          name: expect.any(String),
          isOnline: expect.any(Boolean),
        }),
        todayHealthSummary: expect.objectContaining({
          bloodPressure: null,
          heartRate: null,
          updatedAt: expect.any(String),
        }),
        medicationSummary: expect.objectContaining({
          totalTasks: expect.any(Number),
          completedTasks: expect.any(Number),
          pendingTasks: expect.any(Number),
          skippedTasks: expect.any(Number),
          missedTasks: expect.any(Number),
          progress: expect.any(Number),
        }),
        locationSummary: expect.objectContaining({
          hasLocation: expect.any(Boolean),
          latitude: expect.any(Number),
          longitude: expect.any(Number),
          address: expect.any(String),
        }),
        alerts: expect.any(Array),
        interactionEvidenceSummary: expect.objectContaining({
          familyId: expect.any(Number),
          voiceMessageCount: expect.any(Number),
          albumCount: expect.any(Number),
          pointRecordCount: expect.any(Number),
          hasInteractionEvidence: expect.any(Boolean),
        }),
      },
    });
  });
});
