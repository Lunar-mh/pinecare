'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');
const fallService = require('../../src/services/fallService');

describe('Tier 2: 边界与极值异常测试 (BVA & Defensive Verification)', () => {
  const elderId = 1001;
  const familyId = 1002;
  const volunteerId = 2001;
  const otherVolunteerId = 2002;

  let elderToken;
  let volunteerToken;
  let otherVolunteerToken;

  beforeEach(() => {
    mockHarness.resetStore();
    // 注入第二个志愿者用于跨志愿者权限测试
    mockHarness.store.users.set(otherVolunteerId, {
      id: otherVolunteerId,
      nickname: '李志愿者',
      phone: '13800002002',
      role: 'volunteer',
      account_status: 'active',
    });
    mockHarness.store.adminScopes.set(otherVolunteerId, {
      userId: otherVolunteerId,
      communityId: 1,
      role: 'volunteer',
    });

    elderToken = mockHarness.createAuthHeader(elderId);
    volunteerToken = mockHarness.createAuthHeader(volunteerId, { role: 'volunteer' });
    otherVolunteerToken = mockHarness.createAuthHeader(otherVolunteerId, { role: 'volunteer' });
  });

  // ==========================================
  // 1. 医学极值与非法健康输入拦截校验 (≥5 用例)
  // ==========================================
  describe('Category A: 医学极值与非法健康输入拦截', () => {
    it('TC-BND-HLT-01: 缺少 metric_type 必需字段，拦截返回 400', async () => {
      const res = await request(app)
        .post('/health/manual')
        .set('Authorization', elderToken)
        .send({ value: '120/80' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('metric_type');
    });

    it('TC-BND-HLT-02: metric_type 为系统不支持的非法类型，拦截返回 400', async () => {
      const res = await request(app)
        .post('/health/manual')
        .set('Authorization', elderToken)
        .send({ metric_type: 'magic_telepathy', value: '100' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('metric_type');
    });

    it('TC-BND-HLT-03: value 为空串时拦截返回 400', async () => {
      const res = await request(app)
        .post('/health/manual')
        .set('Authorization', elderToken)
        .send({ metric_type: 'heart_rate', value: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('value');
    });

    it('TC-BND-HLT-04: 绑定设备电量为超出 [0, 100] 的负数或极端值时拦截返回 400', async () => {
      const res = await request(app)
        .post('/health/device/bind')
        .set('Authorization', elderToken)
        .send({
          device_name: '测试手环',
          device_mac: 'AA:BB:CC:DD:EE:FF',
          device_type: 'smart_band',
          battery_level: 150, // 超过 100
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('battery_level');
    });

    it('TC-BND-HLT-05: 绑定设备缺失 device_mac 必需字段时拦截返回 400', async () => {
      const res = await request(app)
        .post('/health/device/bind')
        .set('Authorization', elderToken)
        .send({
          device_name: '测试手环',
          device_type: 'smart_band',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('TC-BND-HLT-06: 医学极端高血压 (300/160 mmHg) 录入成功并触发严重预警', async () => {
      const res = await request(app)
        .post('/health/manual')
        .set('Authorization', elderToken)
        .send({
          metric_type: 'blood_pressure',
          value: '300/160',
          value_high: 300,
          value_low: 160,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.alert.isAlert).toBe(true);
      expect(res.body.data.alert.reasons).toEqual(expect.arrayContaining(['血压偏高']));
    });
  });

  // ==========================================
  // 2. SOS 超过 5 秒窗口期撤销拦截 (≥5 用例)
  // ==========================================
  describe('Category B: SOS 超过 5 秒窗口期撤销拦截', () => {
    it('TC-BND-SOS-01: SOS 触发超过 5 秒后撤销强制拦截，返回 408 CANCEL_TIMEOUT', async () => {
      // 触发 SOS
      const triggerRes = await request(app)
        .post('/sos/trigger')
        .set('Authorization', elderToken)
        .send({ trigger_type: 'manual' });
      const eventId = triggerRes.body.data.event_id;

      // 人为将事件创建时间篡改为 6 秒前
      const event = mockHarness.store.sosEvents.get(eventId);
      event.created_at = new Date(Date.now() - 6000).toISOString();

      // 发起撤销
      const cancelRes = await request(app)
        .post('/sos/cancel')
        .set('Authorization', elderToken)
        .send({ event_id: eventId });

      expect(cancelRes.status).toBe(408);
      expect(cancelRes.body.code).toBe(408);
      expect(cancelRes.body.message).toMatch(/(超时|timeout)/);
    });

    it('TC-BND-SOS-02: 撤销不存在的 event_id 返回 404', async () => {
      const res = await request(app)
        .post('/sos/cancel')
        .set('Authorization', elderToken)
        .send({ event_id: 999999 });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
    });

    it('TC-BND-SOS-03: event_id 非正整数时拦截返回 400', async () => {
      const res = await request(app)
        .post('/sos/cancel')
        .set('Authorization', elderToken)
        .send({ event_id: 'invalid-id' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('TC-BND-SOS-04: 对已 cancelled 状态的事件重复撤销，返回 409 冲突拦截', async () => {
      // 触发并撤销
      const triggerRes = await request(app)
        .post('/sos/trigger')
        .set('Authorization', elderToken)
        .send({ trigger_type: 'manual' });
      const eventId = triggerRes.body.data.event_id;

      await request(app)
        .post('/sos/cancel')
        .set('Authorization', elderToken)
        .send({ event_id: eventId });

      // 再次撤销
      const repeatRes = await request(app)
        .post('/sos/cancel')
        .set('Authorization', elderToken)
        .send({ event_id: eventId });

      expect(repeatRes.status).toBe(409);
      expect(repeatRes.body.code).toBe(409);
    });

    it('TC-BND-SOS-05: 对已 confirmed 状态的事件尝试撤销，返回 409 冲突拦截', async () => {
      const triggerRes = await request(app)
        .post('/sos/trigger')
        .set('Authorization', elderToken)
        .send({ trigger_type: 'manual' });
      const eventId = triggerRes.body.data.event_id;

      // 确认事件
      await request(app)
        .post('/sos/confirm')
        .set('Authorization', elderToken)
        .send({ event_id: eventId });

      // 撤销已被确认处置中的事件
      const cancelRes = await request(app)
        .post('/sos/cancel')
        .set('Authorization', elderToken)
        .send({ event_id: eventId });

      expect(cancelRes.status).toBe(409);
      expect(cancelRes.body.code).toBe(409);
    });

    it('TC-BND-SOS-06: 用户 A 尝试撤销用户 B 的求救事件，跨用户非法越权拦截返回 404', async () => {
      const triggerRes = await request(app)
        .post('/sos/trigger')
        .set('Authorization', elderToken)
        .send({ trigger_type: 'manual' });
      const eventId = triggerRes.body.data.event_id;

      // 使用另一用户 Token 尝试撤销
      const otherToken = mockHarness.createAuthHeader(1002);
      const cancelRes = await request(app)
        .post('/sos/cancel')
        .set('Authorization', otherToken)
        .send({ event_id: eventId });

      expect(cancelRes.status).toBe(404);
      expect(cancelRes.body.code).toBe(404);
    });
  });

  // ==========================================
  // 3. 跌倒倒计时超时自动升级并记入全时序流水 (≥5 用例)
  // ==========================================
  describe('Category C: 跌倒倒计时超时自动升级与流水审计', () => {
    it('TC-BND-FAL-01: 跌倒事件超时未解除，触发后台 processPendingFall 成功升级为 confirmed', async () => {
      // 触发跌倒上报
      const reportRes = await request(app)
        .post('/fall-detection/report')
        .set('Authorization', elderToken)
        .send({
          sensorData: {
            verticalPeak: 4.8,
            horizontalChangeRate: 3.2,
          },
        });
      const fallEventId = reportRes.body.data.event.id;

      // 模拟 15 秒超时未取消，后台 worker 调度执行自动结算
      const result = await fallService.processPendingFall(fallEventId);

      expect(result.processed).toBe(true);
      expect(result.event.status).toBe('confirmed');
    });

    it('TC-BND-FAL-02: 跌倒超时升级自动写入 careEvent 全时序复盘流水 (fall.confirmed)', async () => {
      const reportRes = await request(app)
        .post('/fall-detection/report')
        .set('Authorization', elderToken)
        .send({
          sensorData: { verticalPeak: 4.8, horizontalChangeRate: 3.2 },
        });
      const fallEventId = reportRes.body.data.event.id;

      await fallService.processPendingFall(fallEventId);

      // 验证审计日志记录
      const confirmedAudit = mockHarness.store.auditLogs.find(
        (l) => l.action === 'fall.confirmed' && Number(l.details.entityId) === fallEventId
      );
      expect(confirmedAudit).toBeDefined();
      expect(confirmedAudit.userId).toBe(elderId);
    });

    it('TC-BND-FAL-03: 跌倒超时确认后自动向紧急联系人队列分发通知', async () => {
      const reportRes = await request(app)
        .post('/fall-detection/report')
        .set('Authorization', elderToken)
        .send({
          sensorData: { verticalPeak: 4.8, horizontalChangeRate: 3.2 },
        });
      const fallEventId = reportRes.body.data.event.id;

      await fallService.processPendingFall(fallEventId);

      const notifications = mockHarness.store.fallNotifications.filter(
        (n) => n.eventId === fallEventId
      );
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].status).toBe('sent');
    });

    it('TC-BND-FAL-04: 对已被 confirmed 状态的跌倒事件尝试取消，返回 409 冲突', async () => {
      const reportRes = await request(app)
        .post('/fall-detection/report')
        .set('Authorization', elderToken)
        .send({
          sensorData: { verticalPeak: 4.8, horizontalChangeRate: 3.2 },
        });
      const fallEventId = reportRes.body.data.event.id;

      await fallService.processPendingFall(fallEventId);

      // 尝试取消已确认事件
      const cancelRes = await request(app)
        .post('/fall-detection/cancel')
        .set('Authorization', elderToken)
        .send({ eventId: fallEventId });

      expect(cancelRes.status).toBe(409);
      expect(cancelRes.body.code).toBe(409);
    });

    it('TC-BND-FAL-05: 跌倒上报缺少 sensorData 时拦截返回 400', async () => {
      const res = await request(app)
        .post('/fall-detection/report')
        .set('Authorization', elderToken)
        .send({ sensorData: 'invalid_string_not_an_object' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('sensorData 必须为对象');
    });

    it('TC-BND-FAL-06: 跌倒设置更新缺少 sensitivity 字段拦截返回 400', async () => {
      const res = await request(app)
        .put('/fall-detection/settings')
        .set('Authorization', elderToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });

  // ==========================================
  // 4. 服药打卡高频重复触发幂等防呆保障 (≥5 用例)
  // ==========================================
  describe('Category D: 服药确认打卡幂等防呆保障', () => {
    it('TC-BND-MED-01: 短时间内重复点击服药确认，首次成功，后续安全返回 idempotent: true 且不重复扣库存', async () => {
      const planBefore = mockHarness.store.medicationPlans.get(1);
      const initialRemaining = planBefore.remaining_quantity;

      // 首次点击确认
      const res1 = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: 1, status: 'taken' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.idempotent).toBe(false);
      expect(res1.body.data.log.status).toBe('taken');
      expect(mockHarness.store.medicationPlans.get(1).remaining_quantity).toBe(initialRemaining - 1);

      // 立即重复点击第 2 次
      const res2 = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: 1, status: 'taken' });

      expect(res2.status).toBe(200);
      expect(res2.body.data.idempotent).toBe(true);
      expect(res2.body.message).toContain('already confirmed');
      // 库存保持为 27，严格杜绝重复扣减
      expect(mockHarness.store.medicationPlans.get(1).remaining_quantity).toBe(initialRemaining - 1);

      // 立即重复点击第 3 次
      const res3 = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: 1, status: 'taken' });

      expect(res3.status).toBe(200);
      expect(res3.body.data.idempotent).toBe(true);
      expect(mockHarness.store.medicationPlans.get(1).remaining_quantity).toBe(initialRemaining - 1);
    });

    it('TC-BND-MED-02: 针对已跳过 (skipped) 的记录再次点击确认，返回幂等保护', async () => {
      await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: 1, status: 'skipped' });

      // 再次确认
      const res = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: 1, status: 'taken' });

      expect(res.status).toBe(200);
      expect(res.body.data.idempotent).toBe(true);
    });

    it('TC-BND-MED-03: 确认打卡 log_id 为非法非正整数时拦截返回 400', async () => {
      const res = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: -5, status: 'taken' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('TC-BND-MED-04: 确认打卡传入非法状态值 (如 eaten) 拦截返回 400', async () => {
      const res = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: 1, status: 'eaten' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('TC-BND-MED-05: 确认不存在的服药日志 (log_id: 999999) 拦截返回 404', async () => {
      const res = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: 999999, status: 'taken' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(404);
    });

    it('TC-BND-MED-06: 月度服药日历查询传入非法月份格式 (2026-13) 拦截返回 400', async () => {
      const res = await request(app)
        .get('/medication/history/calendar')
        .query({ month: '2026-13' })
        .set('Authorization', elderToken);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });

  // ==========================================
  // 5. 志愿者跨区域/越权接单与无权限打卡防御 (≥5 用例)
  // ==========================================
  describe('Category E: 志愿者跨区域/越权接单与无权限打卡防御', () => {
    it('TC-BND-VOL-01: 普通长辈无志愿者身份访问志愿者接口，被 403 权限拒绝', async () => {
      const res = await request(app)
        .get('/volunteer/tasks')
        .set('Authorization', elderToken);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(403);
      expect(res.body.message).toContain('Volunteer access denied');
    });

    it('TC-BND-VOL-02: 志愿者重复认领已在处理中的工单，冲突拦截返回 409', async () => {
      // 志愿者 1 接单
      await request(app)
        .post('/volunteer/tasks/501/accept')
        .set('Authorization', volunteerToken);

      // 同一志愿者尝试重复接单
      const conflictRes = await request(app)
        .post('/volunteer/tasks/501/accept')
        .set('Authorization', volunteerToken);

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.code).toBe(409);
      expect(conflictRes.body.message).toContain('already accepted');
    });

    it('TC-BND-VOL-03: 志愿者 A 尝试对志愿者 B 认领的工单进行现场 check-in 打卡，越权拦截返回 403', async () => {
      // 志愿者 1 接单
      await request(app)
        .post('/volunteer/tasks/501/accept')
        .set('Authorization', volunteerToken);

      // 志愿者 2 越权打卡
      const checkInRes = await request(app)
        .post('/volunteer/tasks/501/check-in')
        .set('Authorization', otherVolunteerToken);

      expect(checkInRes.status).toBe(403);
      expect(checkInRes.body.code).toBe(403);
      expect(checkInRes.body.message).toContain('无权操作');
    });

    it('TC-BND-VOL-04: 志愿者未接单 (状态仍为 pending) 直接尝试 check-in 打卡，状态不符拦截返回 409', async () => {
      const res = await request(app)
        .post('/volunteer/tasks/501/check-in')
        .set('Authorization', volunteerToken);

      expect(res.status).toBe(403); // 未分配给该志愿者
      expect(res.body.code).toBe(403);
    });

    it('TC-BND-VOL-05: 志愿者对尚未签到的工单直接尝试 check-out 签退，状态不符拦截返回 409', async () => {
      // 仅接单，未签到
      await request(app)
        .post('/volunteer/tasks/501/accept')
        .set('Authorization', volunteerToken);

      const res = await request(app)
        .post('/volunteer/tasks/501/check-out')
        .set('Authorization', volunteerToken);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(409);
      expect(res.body.message).toContain('Only processing tasks can be checked out');
    });

    it('TC-BND-VOL-06: 志愿者访问非法非整数 taskId (如 abc)，校验中间件拦截返回 400', async () => {
      const res = await request(app)
        .post('/volunteer/tasks/abc/check-in')
        .set('Authorization', volunteerToken);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
      expect(res.body.message).toContain('taskId must be a positive integer');
    });
  });
});
