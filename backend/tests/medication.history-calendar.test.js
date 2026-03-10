'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/services/medicationHistoryService', () => ({
  getCalendar: jest.fn(),
}));

const medicationHistoryService = require('../src/services/medicationHistoryService');
const medicationHistoryRoutes = require('../src/routes/medicationHistoryRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/medication/history', medicationHistoryRoutes);
  return app;
}

describe('用药历史日历接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /medication/history/calendar 返回月历统计', async () => {
    medicationHistoryService.getCalendar.mockResolvedValue({
      month: '2026-02',
      days: [
        { date: '2026-02-01', taken: 2, missed: 0, skipped: 0, pending: 0, total: 2 },
        { date: '2026-02-02', taken: 1, missed: 1, skipped: 0, pending: 0, total: 2 },
      ],
    });

    const app = createApp();
    const res = await request(app).get('/medication/history/calendar?month=2026-02');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('获取用药历史日历成功');
    expect(res.body.data.days.length).toBe(2);
  });

  it('GET /medication/history/calendar month 非法返回 400', async () => {
    const app = createApp();
    const res = await request(app).get('/medication/history/calendar?month=2026/02');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('month 格式必须为 YYYY-MM');
    expect(medicationHistoryService.getCalendar).not.toHaveBeenCalled();
  });
});
