'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { userId: 8101 };
  next();
});

jest.mock('../../src/services/familyService', () => ({
  getFamilyBindings: jest.fn(),
  getElderlyOverview: jest.fn(),
  getElderHealth: jest.fn(),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
}));

jest.mock('../../src/services/familySpaceService', () => ({
  sendMessage: jest.fn(),
  listMessages: jest.fn(),
  uploadAlbum: jest.fn(),
  listAlbum: jest.fn(),
  getPoints: jest.fn(),
  getLeaderboard: jest.fn(),
}));

const familySpaceService = require('../../src/services/familySpaceService');
const familyRouter = require('../../src/routes/family');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/family', familyRouter);
  return app;
}

describe('family space API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /family/message/list matches the published family-space contract path', async () => {
    familySpaceService.listMessages.mockResolvedValue({
      list: [
        {
          id: 201,
          fromUserId: 8101,
          toUserId: 8102,
          audioUrl: 'https://cdn.example.com/family-space/audio/201.mp3',
          durationSeconds: 9,
          createdAt: '2026-03-11T10:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    });

    const res = await request(createApp()).get('/family/message/list?page=1&pageSize=20');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: expect.any(String),
      data: {
        list: [
          expect.objectContaining({
            id: expect.any(Number),
            fromUserId: expect.any(Number),
            toUserId: expect.any(Number),
            audioUrl: expect.any(String),
            durationSeconds: expect.any(Number),
          }),
        ],
        pagination: expect.objectContaining({
          page: expect.any(Number),
          pageSize: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      },
    });
    expect(familySpaceService.listMessages).toHaveBeenCalledWith(8101, {
      page: '1',
      pageSize: '20',
    });
  });

  it('GET /family/points matches the published family-space contract path', async () => {
    familySpaceService.getPoints.mockResolvedValue({
      totalPoints: 16,
      details: [
        {
          id: 1,
          type: 'album_upload',
          points: 3,
          createdAt: '2026-03-11T08:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });

    const res = await request(createApp()).get('/family/points?page=1&pageSize=10');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: expect.any(String),
      data: {
        totalPoints: expect.any(Number),
        details: expect.any(Array),
        pagination: expect.objectContaining({
          page: expect.any(Number),
          pageSize: expect.any(Number),
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      },
    });
  });
});