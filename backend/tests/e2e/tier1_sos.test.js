'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');

describe('Tier 1: SOS紧急呼救与跌倒检测核心功能全覆盖 (SOS)', () => {
  const elderId = 1001;
  let elderToken;

  beforeEach(() => {
    mockHarness.resetStore();
    elderToken = mockHarness.createAuthHeader(elderId);
  });

  // 用例 1: 一键求救触发
  it('TC-SOS-01: POST /sos/trigger 一键触发紧急呼救，成功创建事件并返回 triggered 状态', async () => {
    const res = await request(app)
      .post('/sos/trigger')
      .set('Authorization', elderToken)
      .send({
        latitude: 30.2741,
        longitude: 120.1551,
        address: '浙江省杭州市西湖区翠竹新村3栋201室',
        trigger_type: 'manual',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toContain('SOS event created');
    expect(res.body.data).toHaveProperty('event_id');
    expect(res.body.data.event_status).toBe('triggered');
  });

  // 用例 2: 5秒防误触冷静期内撤销
  it('TC-SOS-02: POST /sos/cancel 5秒防误触窗口期内成功撤销呼救，状态跃迁为 cancelled', async () => {
    // 先触发
    const triggerRes = await request(app)
      .post('/sos/trigger')
      .set('Authorization', elderToken)
      .send({
        latitude: 30.2741,
        longitude: 120.1551,
        address: '翠竹新村3栋201',
      });
    const eventId = triggerRes.body.data.event_id;

    // 立即撤销（< 5秒）
    const cancelRes = await request(app)
      .post('/sos/cancel')
      .set('Authorization', elderToken)
      .send({ event_id: eventId });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.code).toBe(0);
    expect(cancelRes.body.data.event_status).toBe('cancelled');
    expect(cancelRes.body.data.event_id).toBe(eventId);
  });

  // 用例 3: 跌倒检测上报 - 判定为跌倒
  it('TC-SOS-03: POST /fall-detection/report 手环加速度超出阈值，判定跌倒并进入 15秒倒计时', async () => {
    const res = await request(app)
      .post('/fall-detection/report')
      .set('Authorization', elderToken)
      .send({
        sensorData: {
          verticalPeak: 4.5, // 超过 medium 阈值 3.0
          horizontalChangeRate: 3.5, // 超过 medium 阈值 2.0
          impactDurationMs: 400,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.detected).toBe(true);
    expect(res.body.data.countdownSeconds).toBe(15);
    expect(res.body.data.event.status).toBe('detecting');
  });

  // 用例 4: 跌倒检测上报 - 轻微动作误报过滤
  it('TC-SOS-04: POST /fall-detection/report 手环轻微摆动未超阈值，判定为 false_alarm 误报', async () => {
    const res = await request(app)
      .post('/fall-detection/report')
      .set('Authorization', elderToken)
      .send({
        sensorData: {
          verticalPeak: 1.2, // 低于阈值
          horizontalChangeRate: 0.8,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.detected).toBe(false);
    expect(res.body.data.reason).toBe('no-fall');
    expect(res.body.data.event.status).toBe('false_alarm');
  });

  // 用例 5: 15秒内误报主动解除
  it('TC-SOS-05: POST /fall-detection/cancel 倒计时内长辈主动解除误报，状态跃迁为 cancelled', async () => {
    // 触发跌倒
    const reportRes = await request(app)
      .post('/fall-detection/report')
      .set('Authorization', elderToken)
      .send({
        sensorData: {
          verticalPeak: 4.2,
          horizontalChangeRate: 3.0,
        },
      });
    const fallEventId = reportRes.body.data.event.id;

    // 倒计时内撤销
    const cancelRes = await request(app)
      .post('/fall-detection/cancel')
      .set('Authorization', elderToken)
      .send({ eventId: fallEventId });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.code).toBe(0);
    expect(cancelRes.body.data.cancelled).toBe(true);
    expect(cancelRes.body.data.event.status).toBe('cancelled');
  });

  // 用例 6: 求救历史记录分页查询
  it('TC-SOS-06: GET /sos/history 查询长辈求救事件全景历史流水', async () => {
    // 制造一条历史
    await request(app)
      .post('/sos/trigger')
      .set('Authorization', elderToken)
      .send({ trigger_type: 'manual', address: '测试地址1' });

    const res = await request(app)
      .get('/sos/history')
      .query({ page: 1, pageSize: 10 })
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data.list)).toBe(true);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  // 用例 7: 求救事件明细查询
  it('TC-SOS-07: GET /sos/events/:eventId 查询单条求救详情与坐标定位', async () => {
    const triggerRes = await request(app)
      .post('/sos/trigger')
      .set('Authorization', elderToken)
      .send({
        latitude: 30.2741,
        longitude: 120.1551,
        address: '翠竹新村3栋201',
      });
    const eventId = triggerRes.body.data.event_id;

    const res = await request(app)
      .get(`/sos/events/${eventId}`)
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.event_id).toBe(eventId);
    expect(res.body.data.address).toBe('翠竹新村3栋201');
    expect(res.body.data.event_status).toBe('triggered');
  });

  // 用例 8: 确认求救响应
  it('TC-SOS-08: POST /sos/confirm 确认救助中，事件状态跃迁为 confirmed', async () => {
    const triggerRes = await request(app)
      .post('/sos/trigger')
      .set('Authorization', elderToken)
      .send({ trigger_type: 'manual' });
    const eventId = triggerRes.body.data.event_id;

    const res = await request(app)
      .post('/sos/confirm')
      .set('Authorization', elderToken)
      .send({ event_id: eventId });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.event_status).toBe('confirmed');
  });

  // 用例 9: 应急救援结案
  it('TC-SOS-09: POST /sos/resolve 应急救援处置完成，事件状态归档为 resolved', async () => {
    const triggerRes = await request(app)
      .post('/sos/trigger')
      .set('Authorization', elderToken)
      .send({ trigger_type: 'manual' });
    const eventId = triggerRes.body.data.event_id;

    // 先 confirmed
    await request(app)
      .post('/sos/confirm')
      .set('Authorization', elderToken)
      .send({ event_id: eventId });

    // 后 resolved
    const res = await request(app)
      .post('/sos/resolve')
      .set('Authorization', elderToken)
      .send({ event_id: eventId });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.event_status).toBe('resolved');
  });

  // 用例 10: 跌倒检测灵敏度设置查询与更新
  it('TC-SOS-10: GET & PUT /fall-detection/settings 跌倒灵敏度查询与适老化调校', async () => {
    // 查询默认
    const getRes = await request(app)
      .get('/fall-detection/settings')
      .set('Authorization', elderToken);
    expect(getRes.status).toBe(200);
    expect(getRes.body.code).toBe(0);
    expect(getRes.body.data.sensitivity).toBe('medium');

    // 调为高灵敏度 (high)
    const putRes = await request(app)
      .put('/fall-detection/settings')
      .set('Authorization', elderToken)
      .send({ sensitivity: 'high' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.code).toBe(0);
    expect(putRes.body.data.sensitivity).toBe('high');
  });
});
