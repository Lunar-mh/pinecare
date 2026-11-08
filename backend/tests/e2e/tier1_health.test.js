'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');

describe('Tier 1: 居家健康监测核心功能全覆盖 (Health)', () => {
  const elderId = 1001;
  let elderToken;

  beforeEach(() => {
    mockHarness.resetStore();
    elderToken = mockHarness.createAuthHeader(elderId);
  });

  // 用例 1: 今日健康概览快照加载
  it('TC-HEALTH-01: GET /health/today 成功加载今日体征快照与健康状态', async () => {
    const res = await request(app)
      .get('/health/today')
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toContain('Health overview loaded');
    expect(res.body.data).toHaveProperty('metrics');
    expect(res.body.data).toHaveProperty('alerts');
    expect(Array.isArray(res.body.data.alerts)).toBe(true);
  });

  // 用例 2: 7天血压历史趋势图谱查询
  it('TC-HEALTH-02: GET /health/trend 查询 7天 血压趋势图谱', async () => {
    const res = await request(app)
      .get('/health/trend')
      .query({ metric_type: 'blood_pressure', period: '7d' })
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data.metricType).toBe('blood_pressure');
    expect(res.body.data.period).toBe('7d');
    expect(Array.isArray(res.body.data.list)).toBe(true);
  });

  // 用例 3: 30天心率历史趋势图谱查询
  it('TC-HEALTH-03: GET /health/trend 查询 30天 心率趋势图谱', async () => {
    const res = await request(app)
      .get('/health/trend')
      .query({ metric_type: 'heart_rate', period: '30d' })
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.metricType).toBe('heart_rate');
    expect(res.body.data.period).toBe('30d');
  });

  // 用例 4: 手动录入正常血压记录
  it('TC-HEALTH-04: POST /health/manual 手动录入正常血压 (118/78)，保存成功且无异常警报', async () => {
    const res = await request(app)
      .post('/health/manual')
      .set('Authorization', elderToken)
      .send({
        metric_type: 'blood_pressure',
        value: '118/78',
        value_high: 118,
        value_low: 78,
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.record.value).toBe('118/78');
    expect(res.body.data.record.source).toBe('manual');
    expect(res.body.data.alert.isAlert).toBe(false);
  });

  // 用例 5: 手动录入偏高血压，自动触发阈值预警
  it('TC-HEALTH-05: POST /health/manual 手动录入偏高血压 (156/96)，保存成功并触发预警', async () => {
    const res = await request(app)
      .post('/health/manual')
      .set('Authorization', elderToken)
      .send({
        metric_type: 'blood_pressure',
        value: '156/96',
        value_high: 156,
        value_low: 96,
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.alert.isAlert).toBe(true);
    expect(res.body.data.alert.reasons).toEqual(expect.arrayContaining(['血压偏高']));
  });

  // 用例 6: 手动录入心动过速心率
  it('TC-HEALTH-06: POST /health/manual 手动录入偏快心率 (115 bpm)，触发心率异常报警', async () => {
    const res = await request(app)
      .post('/health/manual')
      .set('Authorization', elderToken)
      .send({
        metric_type: 'heart_rate',
        value: '115',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.alert.isAlert).toBe(true);
    expect(res.body.data.alert.reasons).toEqual(expect.arrayContaining(['心率异常']));
  });

  // 用例 7: 设备列表检索
  it('TC-HEALTH-07: GET /health/device/list 成功检索长辈已绑定设备列表', async () => {
    const res = await request(app)
      .get('/health/device/list')
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data.list)).toBe(true);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.list[0].device_name).toContain('智能跌倒监测手环');
  });

  // 用例 8: 绑定新智能健康设备
  it('TC-HEALTH-08: POST /health/device/bind 成功绑定新智能血压计', async () => {
    const res = await request(app)
      .post('/health/device/bind')
      .set('Authorization', elderToken)
      .send({
        device_name: '鱼跃智能蓝牙血压计 YE680B',
        device_mac: 'E4:AA:EC:12:34:56',
        device_type: 'blood_pressure_monitor',
        battery_level: 95,
        is_primary: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.device.device_name).toBe('鱼跃智能蓝牙血压计 YE680B');
    expect(res.body.data.device.device_mac).toBe('E4:AA:EC:12:34:56');
  });

  // 用例 9: 设置为主设备
  it('TC-HEALTH-09: POST /health/device/set-primary 成功指定目标设备为主监测设备', async () => {
    // 绑定第二个设备
    const bindRes = await request(app)
      .post('/health/device/bind')
      .set('Authorization', elderToken)
      .send({
        device_name: '欧姆龙主臂式血压计',
        device_mac: '00:11:22:33:44:55',
        device_type: 'blood_pressure_monitor',
        battery_level: 80,
      });
    const newDeviceId = bindRes.body.data.device.id;

    // 设为主设备
    const res = await request(app)
      .post('/health/device/set-primary')
      .set('Authorization', elderToken)
      .send({ device_id: newDeviceId });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.deviceId).toBe(newDeviceId);
  });

  // 用例 10: 解绑设备
  it('TC-HEALTH-10: POST /health/device/unbind 成功解除设备绑定关系', async () => {
    const res = await request(app)
      .post('/health/device/unbind')
      .set('Authorization', elderToken)
      .send({ device_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.unbound).toBe(true);

    // 再次查询设备列表确认已解绑
    const listRes = await request(app)
      .get('/health/device/list')
      .set('Authorization', elderToken);
    expect(listRes.body.data.list.find((d) => d.id === 1)).toBeUndefined();
  });
});
