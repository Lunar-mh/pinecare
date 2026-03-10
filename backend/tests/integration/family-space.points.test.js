'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 8101 };
    next();
  };
});

jest.mock('../../src/services/familySpaceService', () => ({
  sendMessage: jest.fn(),
  listMessages: jest.fn(),
  uploadAlbum: jest.fn(),
  listAlbum: jest.fn(),
  getPoints: jest.fn(),
  getLeaderboard: jest.fn(),
}));

const familySpaceService = require('../../src/services/familySpaceService');
const familySpaceRouter = require('../../src/routes/familySpace');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/family-space', familySpaceRouter);
  return app;
}

describe('家庭空间孝心值接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /family-space/points 空数据返回总分 0', async () => {
    familySpaceService.getPoints.mockResolvedValue({
      totalPoints: 0,
      details: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    });

    const app = createApp();
    const res = await request(app).get('/family-space/points?page=1&pageSize=10');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('孝心值查询成功');
    expect(res.body.data.totalPoints).toBe(0);
    expect(res.body.data.details).toEqual([]);
  });

  test('GET /family-space/leaderboard 支持并列分与分页参数', async () => {
    familySpaceService.getLeaderboard.mockResolvedValue({
      familyId: 9001,
      list: [
        { rank: 1, userId: 8102, totalPoints: 5 },
        { rank: 2, userId: 8103, totalPoints: 5 },
      ],
      pagination: {
        page: 1,
        pageSize: 2,
        total: 3,
        totalPages: 2,
      },
    });

    const app = createApp();
    const res = await request(app).get('/family-space/leaderboard?family_id=9001&page=1&pageSize=2');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('家庭孝心值排行榜查询成功');
    expect(res.body.data.list[0].totalPoints).toBe(5);
    expect(res.body.data.list[1].totalPoints).toBe(5);
    expect(familySpaceService.getLeaderboard).toHaveBeenCalledWith(8101, {
      familyId: '9001',
      page: '1',
      pageSize: '2',
    });
  });
});
