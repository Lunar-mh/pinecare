'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

jest.mock('../../src/services/sosService', () => ({
  triggerSos: jest.fn(),
  cancelSos: jest.fn(),
  getHistory: jest.fn(),
  confirmSos: jest.fn(),
  resolveSos: jest.fn(),
  autoResolveTimeoutEvents: jest.fn(),
}));

const sosService = require('../../src/services/sosService');
const sosRouter = require('../../src/routes/sos');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/sos', sosRouter);
  return app;
}

describe('SOS 触发与取消集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /sos/trigger 未鉴权应返回 401', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/sos/trigger')
      .send({ latitude: 30.1, longitude: 120.1 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  test('POST /sos/trigger 成功返回统一结构', async () => {
    const app = createApp();
    const token = jwt.sign({ userId: 9001 }, process.env.JWT_SECRET || 'fallback_secret');

    sosService.triggerSos.mockResolvedValue({
      event_id: 501,
      event_status: 'triggered',
    });

    const res = await request(app)
      .post('/sos/trigger')
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: 30.1, longitude: 120.1, address: '杭州市西湖区' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: 'ok',
      data: { event_id: 501, event_status: 'triggered' },
    });
    expect(sosService.triggerSos).toHaveBeenCalledWith(9001, {
      latitude: 30.1,
      longitude: 120.1,
      address: '杭州市西湖区',
    });
  });

  test('POST /sos/cancel 业务失败返回 4xx', async () => {
    const app = createApp();
    const token = jwt.sign({ userId: 9001 }, process.env.JWT_SECRET || 'fallback_secret');

    const bizErr = new Error('取消窗口已超时');
    bizErr.code = 408;
    bizErr.statusCode = 408;
    sosService.cancelSos.mockRejectedValue(bizErr);

    const res = await request(app)
      .post('/sos/cancel')
      .set('Authorization', `Bearer ${token}`)
      .send({ event_id: 501 });

    expect(res.status).toBe(408);
    expect(res.body).toEqual({
      code: 408,
      message: '取消窗口已超时',
      data: null,
    });
  });
});
