'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/services/healthManualService', () => ({
  createManualRecord: jest.fn(),
}));

const healthManualService = require('../src/services/healthManualService');
const healthArchiveRouter = require('../src/routes/healthArchive');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health-archive', healthArchiveRouter);
  return app;
}

describe('健康手动录入路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /health-archive/manual 创建记录成功', async () => {
    healthManualService.createManualRecord.mockResolvedValue({
      record: {
        id: 10,
        metricType: 'heart_rate',
        value: '88',
        source: 'manual',
      },
      alert: { isAlert: false, reasons: [] },
    });

    const app = createApp();
    const res = await request(app)
      .post('/health-archive/manual')
      .send({ metric_type: 'heart_rate', value: '88' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.record.source).toBe('manual');
  });

  it('POST /health-archive/manual 缺少指标类型时返回校验错误', async () => {
    const err = new Error('metric_type is required.');
    err.code = 400;
    err.statusCode = 400;
    healthManualService.createManualRecord.mockRejectedValue(err);

    const app = createApp();
    const res = await request(app).post('/health-archive/manual').send({ value: '88' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('metric_type is required.');
  });
});
