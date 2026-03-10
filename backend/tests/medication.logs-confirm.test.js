'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/services/medicationLogService', () => ({
  getLogs: jest.fn(),
}));

jest.mock('../src/services/medicationConfirmService', () => ({
  confirm: jest.fn(),
}));

const medicationLogService = require('../src/services/medicationLogService');
const medicationConfirmService = require('../src/services/medicationConfirmService');
const medicationRouter = require('../src/routes/medication');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/medication', medicationRouter);
  return app;
}

describe('服药日志与确认接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /medication/logs 支持日期过滤', async () => {
    medicationLogService.getLogs.mockResolvedValue({
      list: [
        {
          id: 10,
          user_id: 1001,
          plan_id: 1,
          medication_name: '降压药',
          scheduled_time: '2026-02-21 08:00:00',
          status: 'taken',
        },
      ],
      filters: {
        start_date: '2026-02-01',
        end_date: '2026-02-28',
      },
      total: 1,
    });

    const app = createApp();
    const res = await request(app).get('/medication/logs?start_date=2026-02-01&end_date=2026-02-28');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('获取服药记录成功');
    expect(res.body.data.total).toBe(1);
  });

  it('POST /medication/confirm 确认成功', async () => {
    medicationConfirmService.confirm.mockResolvedValue({
      idempotent: false,
      log: {
        id: 10,
        status: 'taken',
      },
    });

    const app = createApp();
    const res = await request(app).post('/medication/confirm').send({
      log_id: 10,
      status: 'taken',
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('服药确认成功');
    expect(res.body.data.log.status).toBe('taken');
  });

  it('POST /medication/confirm 幂等确认', async () => {
    medicationConfirmService.confirm.mockResolvedValue({
      idempotent: true,
      log: {
        id: 10,
        status: 'taken',
      },
    });

    const app = createApp();
    const res = await request(app).post('/medication/confirm').send({
      log_id: 10,
      status: 'taken',
    });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('该记录已确认，无需重复操作');
  });
});
