'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');

describe('Tier 4: 真实长辈适老业务场景测试 (Workload & Elderly Persona Scenarios)', () => {
  const elderId = 1001;
  const familyId = 1002;
  const volunteerId = 2001;
  const adminId = 3001;

  let elderToken;
  let familyToken;
  let volunteerToken;
  let adminToken;

  beforeEach(() => {
    mockHarness.resetStore();
    elderToken = mockHarness.createAuthHeader(elderId);
    familyToken = mockHarness.createAuthHeader(familyId, { role: 'family' });
    volunteerToken = mockHarness.createAuthHeader(volunteerId, { role: 'volunteer' });
    adminToken = mockHarness.createAuthHeader(adminId, { role: 'admin' });
  });

  // =========================================================================
  // 场景 1: 独居长辈清晨日常 (Morning Routine Persona)
  // 测血压 -> 数据自动同步 -> 偏高预警 -> 提醒按时服降压药 -> 打卡记录闭环
  // =========================================================================
  it('SCENARIO-01: 独居长辈清晨日常闭环 (晨间测压 -> 偏高告警 -> 服药提醒 -> 打卡消警)', async () => {
    // 步骤 1: 清晨 07:00 长辈醒来测血压，测得偏高 148/92 mmHg，同步录入系统
    const bpSyncRes = await request(app)
      .post('/health/manual')
      .set('Authorization', elderToken)
      .send({
        metric_type: 'blood_pressure',
        value: '148/92',
        value_high: 148,
        value_low: 92,
      });

    expect(bpSyncRes.status).toBe(200);
    expect(bpSyncRes.body.data.record.value).toBe('148/92');
    expect(bpSyncRes.body.data.alert.isAlert).toBe(true);
    expect(bpSyncRes.body.data.alert.reasons).toContain('血压偏高');

    // 步骤 2: 08:00 降压药服药时间，长辈打开小程序查看今日待服时间轴
    const todayMedsRes = await request(app)
      .get('/medication/today')
      .set('Authorization', elderToken);

    expect(todayMedsRes.status).toBe(200);
    const morningMed = todayMedsRes.body.data.find((m) => m.name === '苯磺酸氨氯地平片');
    expect(morningMed).toBeDefined();
    expect(morningMed.status).toBe('pending');

    // 步骤 3: 长辈温水送服降压药后，点击“确认服药”完成打卡
    const confirmRes = await request(app)
      .post('/medication/confirm')
      .set('Authorization', elderToken)
      .send({
        log_id: morningMed.log_id,
        status: 'taken',
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.log.status).toBe('taken');

    // 步骤 4: 验证慢病管家库存已扣减
    const plan = mockHarness.store.medicationPlans.get(1);
    expect(plan.remaining_quantity).toBe(27);

    // 步骤 5: 家属端打开全景守护界面，确认父亲清晨已成功测压并按时服药
    const overviewRes = await request(app)
      .get('/family/elderly-overview')
      .query({ elderId })
      .set('Authorization', familyToken);

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.medicationSummary.completedTasks).toBe(1);
    expect(overviewRes.body.data.medicationSummary.pendingTasks).toBe(0);
    expect(overviewRes.body.data.medicationSummary.progress).toBe(100);
  });

  // =========================================================================
  // 场景 2: 夜间突发险情紧急救援闭环 (Midnight Emergency Rescue Persona)
  // 凌晨突发不适 -> 一键求助 -> 社区响应 -> 派遣救援 -> 送医结案
  // =========================================================================
  it('SCENARIO-02: 夜间突发险情紧急救援闭环 (一键求助 -> 社区大屏报警 -> 现场确认 -> 结案归档)', async () => {
    // 步骤 1: 凌晨 02:15 独居长辈突发心慌按下 SOS 按钮，发送当前精准位置
    const triggerRes = await request(app)
      .post('/sos/trigger')
      .set('Authorization', elderToken)
      .send({
        latitude: 30.2741,
        longitude: 120.1551,
        address: '翠竹新村3栋201室',
        trigger_type: 'manual',
      });

    expect(triggerRes.status).toBe(200);
    const eventId = triggerRes.body.data.event_id;
    expect(triggerRes.body.data.event_status).toBe('triggered');

    // 步骤 2: 社区值班大屏实时捕获求救弹窗与定位
    const adminEventsRes = await request(app)
      .get('/admin/sos/events')
      .set('Authorization', adminToken)
      .query({ status: 'triggered' });

    expect(adminEventsRes.status).toBe(200);
    const triggeredEvent = adminEventsRes.body.data.list.find((e) => e.event_id === eventId);
    expect(triggeredEvent).toBeDefined();
    expect(triggeredEvent.address).toBe('翠竹新村3栋201室');

    // 步骤 3: 社区值班网格员在管理屏确认接单处置
    const confirmRes = await request(app)
      .put(`/admin/sos/events/${eventId}/status`)
      .set('Authorization', adminToken)
      .send({ status: 'confirmed' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.event_status).toBe('confirmed');

    // 步骤 4: 家属收到紧急预警并打开看板查看长辈险情状态
    const familyViewRes = await request(app)
      .get('/family/elderly-overview')
      .query({ elderId })
      .set('Authorization', familyToken);

    expect(familyViewRes.status).toBe(200);
    expect(familyViewRes.body.data.alerts.some((a) => a.type === 'sos')).toBe(true);

    // 步骤 5: 网格员协同 120 到达现场实施急救送医，大屏最终标记处理结案
    const resolveRes = await request(app)
      .put(`/admin/sos/events/${eventId}/status`)
      .set('Authorization', adminToken)
      .send({ status: 'resolved' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.event_status).toBe('resolved');

    // 步骤 6: 验证事件在历史记录中状态为 resolved
    const detailRes = await request(app)
      .get(`/sos/events/${eventId}`)
      .set('Authorization', elderToken);
    expect(detailRes.body.data.event_status).toBe('resolved');
  });

  // =========================================================================
  // 场景 3: 跌倒防误触自愈全流程 (Fall False-Alarm Self-Healing Persona)
  // 手环误碰冲击 -> 倒计时冷静期 -> 10秒内主动解除 -> 恢复安全常态
  // =========================================================================
  it('SCENARIO-03: 跌倒防误触自愈全流程 (疑似跌倒冲击 -> 15秒倒计时 -> 主动撤销 -> 系统恢复常态)', async () => {
    // 步骤 1: 长辈做家务手环剧烈碰撞，加速度传感器检测到剧烈冲击上报跌倒
    const reportRes = await request(app)
      .post('/fall-detection/report')
      .set('Authorization', elderToken)
      .send({
        sensorData: {
          verticalPeak: 4.5,
          horizontalChangeRate: 3.5,
          impactDurationMs: 380,
        },
      });

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.detected).toBe(true);
    expect(reportRes.body.data.countdownSeconds).toBe(15);
    const fallEventId = reportRes.body.data.event.id;
    expect(reportRes.body.data.event.status).toBe('detecting');

    // 步骤 2: 7秒后长辈发现手环鸣叫震动，长辈身体无碍，在屏幕点击“我没事，取消报警”
    const cancelRes = await request(app)
      .post('/fall-detection/cancel')
      .set('Authorization', elderToken)
      .send({ eventId: fallEventId });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.cancelled).toBe(true);
    expect(cancelRes.body.data.event.status).toBe('cancelled');

    // 步骤 3: 验证系统记录了 fall.cancelled 审计事件，未向家属与 120 触发虚假狼来了骚扰
    const cancelAudit = mockHarness.store.auditLogs.find(
      (l) => l.action === 'fall.cancelled' && Number(l.details.entityId) === fallEventId
    );
    expect(cancelAudit).toBeDefined();
    expect(cancelAudit.userId).toBe(elderId);

    // 步骤 4: 查询跌倒历史，该事件归档标记为 cancelled
    const historyRes = await request(app)
      .get('/fall-detection/history')
      .set('Authorization', elderToken);
    expect(historyRes.status).toBe(200);
    const cancelledItem = historyRes.body.data.list.find((e) => e.id === fallEventId);
    expect(cancelledItem).toBeDefined();
    expect(cancelledItem.status).toBe('cancelled');
  });

  // =========================================================================
  // 场景 4: 志愿者爱心助老上门陪伴 (Volunteer Home Care Escort Persona)
  // 工单发布 -> 志愿者接单 -> 现场扫码签到 -> 贴心陪伴 -> 签退与时间币存证
  // =========================================================================
  it('SCENARIO-04: 志愿者爱心助老上门陪伴全流程 (工单调度 -> 扫码签到 -> 签退 -> 时间币积分结算)', async () => {
    // 步骤 1: 社区创建工单：为独居老人李爷爷提供周末健康关怀与陪伴
    const taskId = 501;

    // 步骤 2: 青年志愿者小张在志愿者大厅发现任务并认领接单
    const acceptRes = await request(app)
      .post(`/volunteer/tasks/${taskId}/accept`)
      .set('Authorization', volunteerToken);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('assigned');
    expect(acceptRes.body.data.volunteer_id).toBe(volunteerId);

    // 步骤 3: 志愿者到达李爷爷家，现场出示服务二维码完成打卡签到
    const checkInRes = await request(app)
      .post(`/volunteer/tasks/${taskId}/check-in`)
      .set('Authorization', volunteerToken);

    expect(checkInRes.status).toBe(200);
    expect(checkInRes.body.data.status).toBe('processing');
    expect(checkInRes.body.data).toHaveProperty('check_in_at');

    // 步骤 4: 志愿者陪伴长辈读报、测血压并打扫居室，2小时后签退打卡
    const checkOutRes = await request(app)
      .post(`/volunteer/tasks/${taskId}/check-out`)
      .set('Authorization', volunteerToken);

    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.data.status).toBe('processing');
    expect(checkOutRes.body.data).toHaveProperty('check_out_at');

    // 步骤 5: 最终提交服务完成归档，自动触发时间银行（TimeBank）2枚时间币结算与哈希上链存证
    const completeRes = await request(app)
      .post(`/volunteer/tasks/${taskId}/complete`)
      .set('Authorization', volunteerToken);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('completed');
    expect(completeRes.body.data).toHaveProperty('settlement');
    expect(completeRes.body.data.settlement.status).toBe('completed');
    expect(completeRes.body.data.settlement).toHaveProperty('completed_at');
  });

  // =========================================================================
  // 场景 5: 慢病长辈月度就医体征全景报告聚合 (Monthly Medical Snapshot Persona)
  // 月度服药日历 + 30天血压心率波动走势 + 家属健康档案汇总
  // =========================================================================
  it('SCENARIO-05: 慢病长辈月度就医体征全景报告聚合 (就医前月度日历 + 30天体征图谱 + 档案聚合)', async () => {
    // 步骤 1: 先在过去30天内注入若干条血压测量记录 (模拟慢病长期监测数据)
    mockHarness.store.healthRecords.push({
      id: 88,
      userId: elderId,
      metricType: 'blood_pressure',
      value: '135/85',
      valueHigh: 135,
      valueLow: 85,
      measuredAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    });
    mockHarness.store.healthRecords.push({
      id: 89,
      userId: elderId,
      metricType: 'blood_pressure',
      value: '132/84',
      valueHigh: 132,
      valueLow: 84,
      measuredAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    });

    // 步骤 2: 家属拉取长辈月度服药遵从日历与考勤
    const calendarRes = await request(app)
      .get('/medication/history/calendar')
      .query({ month: '2026-03' })
      .set('Authorization', familyToken);

    expect(calendarRes.status).toBe(200);
    expect(calendarRes.body.code).toBe(0);
    expect(calendarRes.body.data.month).toBe('2026-03');
    expect(Array.isArray(calendarRes.body.data.days)).toBe(true);
    expect(calendarRes.body.data.days.length).toBe(31);

    // 步骤 3: 家属拉取长辈 30天 血压波动趋势图谱
    const bpTrendRes = await request(app)
      .get('/health/trend')
      .query({ metric_type: 'blood_pressure', period: '30d', user_id: elderId })
      .set('Authorization', familyToken);

    expect(bpTrendRes.status).toBe(200);
    expect(bpTrendRes.body.code).toBe(0);
    expect(bpTrendRes.body.data.period).toBe('30d');
    expect(Array.isArray(bpTrendRes.body.data.list)).toBe(true);
    expect(bpTrendRes.body.data.list.length).toBeGreaterThanOrEqual(2);

    // 步骤 4: 家属穿透拉取长辈深度健康档案快照
    const healthArchiveRes = await request(app)
      .get(`/family/health/${elderId}`)
      .set('Authorization', familyToken);

    expect(healthArchiveRes.status).toBe(200);
    expect(healthArchiveRes.body.code).toBe(0);
    expect(healthArchiveRes.body.data.elderId).toBe(elderId);
    expect(healthArchiveRes.body.data.latestRecords.length).toBeGreaterThanOrEqual(1);

    // 步骤 5: 验证健康报告核心指标完整，可供医院专科医生复诊参考评估
    const latestBp = healthArchiveRes.body.data.latestRecords.find(
      (r) => r.metricType === 'blood_pressure'
    );
    expect(latestBp).toBeDefined();
    expect(latestBp.value).toBeDefined();
  });
});
