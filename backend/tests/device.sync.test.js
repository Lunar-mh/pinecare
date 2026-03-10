'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/services/deviceService', () => ({
  bind: jest.fn(),
  unbind: jest.fn(),
  list: jest.fn(),
  setPrimary: jest.fn(),
}));

jest.mock('../src/services/healthSyncService', () => ({
  sync: jest.fn(),
}));

const deviceService = require('../src/services/deviceService');
const healthSyncService = require('../src/services/healthSyncService');
const healthArchiveRouter = require('../src/routes/healthArchive');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/health-archive', healthArchiveRouter);
  return app;
}

describe('设备管理与同步接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /health-archive/device/bind 绑定成功', async () => {
    deviceService.bind.mockResolvedValue({
      device: { id: 1, deviceName: '手环A', isPrimary: true, bindStatus: 'bound' },
    });

    const app = createApp();
    const res = await request(app)
      .post('/health-archive/device/bind')
      .send({ device_name: '手环A', device_mac: 'AA:BB', device_type: 'band', is_primary: true });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.device.bindStatus).toBe('bound');
  });

  it('POST /health-archive/device/set-primary 保证主设备切换', async () => {
    deviceService.setPrimary.mockResolvedValue({
      deviceId: 2,
      list: [
        { id: 1, isPrimary: false },
        { id: 2, isPrimary: true },
      ],
    });

    const app = createApp();
    const res = await request(app)
      .post('/health-archive/device/set-primary')
      .send({ device_id: 2 });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list.filter((d) => d.isPrimary).length).toBe(1);
  });

  it('POST /health-archive/sync 写入成功并返回同步结果', async () => {
    healthSyncService.sync.mockResolvedValue({
      insertedCount: 2,
      deviceIds: [1],
      alerts: [],
    });

    const app = createApp();
    const res = await request(app)
      .post('/health-archive/sync')
      .send({
        device_id: 1,
        records: [
          { metric_type: 'heart_rate', value: '82' },
          { metric_type: 'blood_oxygen', value: '97' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.insertedCount).toBe(2);
  });
});
