'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');

describe('Tier 1: 用药提醒慢病管家核心功能全覆盖 (Medication)', () => {
  const elderId = 1001;
  let elderToken;

  beforeEach(() => {
    mockHarness.resetStore();
    elderToken = mockHarness.createAuthHeader(elderId);
  });

  // 用例 1: 创建用药计划
  it('TC-MED-01: POST /medication/plans 编排创建高血压慢病用药计划', async () => {
    const res = await request(app)
      .post('/medication/plans')
      .set('Authorization', elderToken)
      .send({
        medication_name: '缬沙坦胶囊',
        dosage: '80mg',
        frequency: 'once_daily',
        remind_times: ['08:30'],
        start_date: '2026-03-01',
        end_date: '2026-03-28',
        remaining_quantity: 28,
        reminder_threshold: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.medication_name).toBe('缬沙坦胶囊');
    expect(res.body.data.dosage).toBe('80mg');
  });

  // 用例 2: 活跃计划列表
  it('TC-MED-02: GET /medication/plans 查询老人当前所有活跃用药计划', async () => {
    const res = await request(app)
      .get('/medication/plans')
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].medication_name).toBe('苯磺酸氨氯地平片');
  });

  // 用例 3: 更新用药计划
  it('TC-MED-03: PUT /medication/plans/:id 更新用药剂量与服药提醒备注', async () => {
    const res = await request(app)
      .put('/medication/plans/1')
      .set('Authorization', elderToken)
      .send({
        medication_name: '苯磺酸氨氯地平片',
        dosage: '10mg',
        frequency: 'twice_daily',
        remind_times: ['08:00', '20:00'],
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.dosage).toBe('10mg');
  });

  // 用例 4: 删除用药计划
  it('TC-MED-04: DELETE /medication/plans/:id 停用/删除指定用药计划', async () => {
    const res = await request(app)
      .delete('/medication/plans/1')
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);

    // 再次拉取已删除计划不在活跃列表中
    const listRes = await request(app)
      .get('/medication/plans')
      .set('Authorization', elderToken);
    expect(listRes.body.data.find((p) => p.id === 1)).toBeUndefined();
  });

  // 用例 5: 今日时间轴待服清单
  it('TC-MED-05: GET /medication/today 获取今日服药时间轴待服清单', async () => {
    const res = await request(app)
      .get('/medication/today')
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].status).toBe('pending');
    expect(res.body.data[0].name).toBe('苯磺酸氨氯地平片');
  });

  // 用例 6: 服药打卡确认 - taken
  it('TC-MED-06: POST /medication/confirm 确认服药打卡 (taken)，状态变更为 taken 且库存扣减', async () => {
    const planBefore = mockHarness.store.medicationPlans.get(1);
    const initialRemaining = planBefore.remaining_quantity;

    const res = await request(app)
      .post('/medication/confirm')
      .set('Authorization', elderToken)
      .send({
        log_id: 1,
        status: 'taken',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.idempotent).toBe(false);
    expect(res.body.data.log.status).toBe('taken');

    // 验证库存递减
    const planAfter = mockHarness.store.medicationPlans.get(1);
    expect(planAfter.remaining_quantity).toBe(initialRemaining - 1);
  });

  // 用例 7: 跳过服药打卡 - skipped
  it('TC-MED-07: POST /medication/confirm 长辈身体不适跳过服药 (skipped)，状态变更为 skipped 且不扣库存', async () => {
    const planBefore = mockHarness.store.medicationPlans.get(1);
    const initialRemaining = planBefore.remaining_quantity;

    const res = await request(app)
      .post('/medication/confirm')
      .set('Authorization', elderToken)
      .send({
        log_id: 1,
        status: 'skipped',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.log.status).toBe('skipped');

    // 验证库存不扣减
    const planAfter = mockHarness.store.medicationPlans.get(1);
    expect(planAfter.remaining_quantity).toBe(initialRemaining);
  });

  // 用例 8: 服药历史日志清单
  it('TC-MED-08: GET /medication/logs 查询长辈服药历史打卡明细流水', async () => {
    const res = await request(app)
      .get('/medication/logs')
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data).toHaveProperty('total');
    expect(Array.isArray(res.body.data.list)).toBe(true);
  });

  // 用例 9: 月度服药日历
  it('TC-MED-09: GET /medication/history/calendar 查询月度服药日历与遵从打卡率', async () => {
    const res = await request(app)
      .get('/medication/history/calendar')
      .query({ month: '2026-03' })
      .set('Authorization', elderToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.month).toBe('2026-03');
    expect(Array.isArray(res.body.data.days)).toBe(true);
    expect(res.body.data.days.length).toBe(31);
    expect(res.body.data.days[0]).toHaveProperty('taken');
  });

  // 用例 10: 未授权访问拦截
  it('TC-MED-10: GET /medication/plans 缺失 Token 访问拦截，返回 401 状态', async () => {
    const res = await request(app).get('/medication/plans');

    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
    expect(res.body.message).toContain('Authentication token is missing');
  });
});
