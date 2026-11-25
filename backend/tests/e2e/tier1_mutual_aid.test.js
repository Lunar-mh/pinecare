'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');

describe('Tier 1: 守护互助与志愿助老核心功能全覆盖 (Mutual Aid)', () => {
  const familyId = 1002;
  const elderId = 1001;
  const volunteerId = 2001;

  let familyToken;
  let volunteerToken;

  beforeEach(() => {
    mockHarness.resetStore();
    familyToken = mockHarness.createAuthHeader(familyId, { role: 'family' });
    volunteerToken = mockHarness.createAuthHeader(volunteerId, { role: 'volunteer' });
  });

  // 用例 1: 家属长辈全景看板
  it('TC-AID-01: GET /family/elderly-overview 家属拉取绑定长辈的全景健康、用药与安全看板', async () => {
    const res = await request(app)
      .get('/family/elderly-overview')
      .query({ elderId })
      .set('Authorization', familyToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('elderProfile');
    expect(res.body.data.elderProfile.elderId).toBe(elderId);
    expect(res.body.data).toHaveProperty('todayHealthSummary');
    expect(res.body.data).toHaveProperty('medicationSummary');
    expect(res.body.data).toHaveProperty('locationSummary');
    expect(res.body.data).toHaveProperty('alerts');
  });

  // 用例 2: 亲情绑定列表
  it('TC-AID-02: GET /family/bindings 查询家属绑定的所有长辈亲情纽带关系', async () => {
    const res = await request(app)
      .get('/family/bindings')
      .set('Authorization', familyToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].elderId).toBe(elderId);
    expect(res.body.data[0].relationship).toBe('女儿');
  });

  // 用例 3: 查看指定长辈深度健康档案
  it('TC-AID-03: GET /family/health/:elderId 家属穿透查阅长辈多维度健康监测体征', async () => {
    const res = await request(app)
      .get(`/family/health/${elderId}`)
      .set('Authorization', familyToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.elderId).toBe(elderId);
    expect(res.body.data).toHaveProperty('archive');
    expect(res.body.data).toHaveProperty('latestRecords');
    expect(Array.isArray(res.body.data.latestRecords)).toBe(true);
  });

  // 用例 4: 查询家属推送偏好设置
  it('TC-AID-04: GET /family/settings 查询家属个性化关怀推送通知开关', async () => {
    const res = await request(app)
      .get('/family/settings')
      .set('Authorization', familyToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.healthAlertEnabled).toBe(true);
    expect(res.body.data.medicationReminderEnabled).toBe(true);
    expect(res.body.data.sosAlertEnabled).toBe(true);
  });

  // 用例 5: 更新家属推送开关
  it('TC-AID-05: PUT /family/settings 动态更新家属消息订阅开关偏好', async () => {
    const res = await request(app)
      .put('/family/settings')
      .set('Authorization', familyToken)
      .send({
        medication_reminder_enabled: false,
        sos_alert_enabled: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.medicationReminderEnabled).toBe(false);
    expect(res.body.data.sosAlertEnabled).toBe(true);
  });

  // 用例 6: 志愿者个人档案查询
  it('TC-AID-06: GET /volunteer/profile 查询志愿者工作档案、累积服务工时与星级评价', async () => {
    const res = await request(app)
      .get('/volunteer/profile')
      .set('Authorization', volunteerToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.name).toBe('张青年');
    expect(res.body.data.role).toBe('volunteer');
    expect(res.body.data.community_id).toBe(1);
  });

  // 用例 7: 志愿者待接单助老工单查询
  it('TC-AID-07: GET /volunteer/tasks 检索本社区待认领志愿助老任务列表', async () => {
    const res = await request(app)
      .get('/volunteer/tasks')
      .query({ status: 'pending' })
      .set('Authorization', volunteerToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.list[0].status).toBe('pending');
    expect(res.body.data.list[0].elder_name).toBe('李建国');
  });

  // 用例 8: 志愿者认领工单 (accept)
  it('TC-AID-08: POST /volunteer/tasks/:id/accept 志愿者接单认领，状态跃迁为 assigned', async () => {
    const res = await request(app)
      .post('/volunteer/tasks/501/accept')
      .set('Authorization', volunteerToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.task_id).toBe(501);
    expect(res.body.data.status).toBe('assigned');
    expect(res.body.data.volunteer_id).toBe(volunteerId);
  });

  // 用例 9: 志愿者现场打卡签到 (check-in)
  it('TC-AID-09: POST /volunteer/tasks/:id/check-in 志愿者到达长辈家扫码签到，状态跃迁为 processing', async () => {
    // 先接单
    await request(app)
      .post('/volunteer/tasks/501/accept')
      .set('Authorization', volunteerToken);

    // 签到打卡
    const res = await request(app)
      .post('/volunteer/tasks/501/check-in')
      .set('Authorization', volunteerToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('processing');
    expect(res.body.data).toHaveProperty('check_in_at');
  });

  // 用例 10: 志愿者服务签退 (check-out)
  it('TC-AID-10: POST /volunteer/tasks/:id/check-out 志愿者陪伴关怀结束签退', async () => {
    // 先接单并签到
    await request(app)
      .post('/volunteer/tasks/501/accept')
      .set('Authorization', volunteerToken);
    await request(app)
      .post('/volunteer/tasks/501/check-in')
      .set('Authorization', volunteerToken);

    // 签退打卡
    const res = await request(app)
      .post('/volunteer/tasks/501/check-out')
      .set('Authorization', volunteerToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('processing');
    expect(res.body.data).toHaveProperty('check_out_at');
  });

  // 用例 11: 助老工单完成与时间币结算 (complete)
  it('TC-AID-11: POST /volunteer/tasks/:id/complete 最终完成工单，状态跃迁为 completed 并结算时间币', async () => {
    // 完整流程：接单 -> 签到 -> 完成
    await request(app)
      .post('/volunteer/tasks/501/accept')
      .set('Authorization', volunteerToken);
    await request(app)
      .post('/volunteer/tasks/501/check-in')
      .set('Authorization', volunteerToken);

    const res = await request(app)
      .post('/volunteer/tasks/501/complete')
      .set('Authorization', volunteerToken);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data).toHaveProperty('settlement');
    expect(res.body.data.settlement.status).toBe('completed');
    expect(res.body.data.settlement).toHaveProperty('completed_at');
  });
});
