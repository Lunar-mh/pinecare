'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');

describe('Tier 3: 跨系统组合联动流 (Pairwise Integration Flows)', () => {
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
  // 联动流 1: SOS 险情触发 -> 时序流水 -> 社区管理屏报警 -> 志愿者工单调度
  // =========================================================================
  describe('Pairwise Flow 1: SOS 险情全时序与社区调度闭环', () => {
    it('TC-PAIR-01: 长辈触发一键SOS，自动记入时序流水并在社区管理屏即时报警，随后调度志愿者响应', async () => {
      // 1. 长辈端在老人机/小程序触发一键紧急呼救
      const triggerRes = await request(app)
        .post('/sos/trigger')
        .set('Authorization', elderToken)
        .send({
          latitude: 30.2741,
          longitude: 120.1551,
          address: '浙江省杭州市西湖区翠竹新村3栋201室',
          trigger_type: 'manual',
        });

      expect(triggerRes.status).toBe(200);
      expect(triggerRes.body.code).toBe(0);
      const eventId = triggerRes.body.data.event_id;
      expect(triggerRes.body.data.event_status).toBe('triggered');

      // 2. 验证时序流水记账已写入 AuditLog / CareEvent
      const auditLogEntry = mockHarness.store.auditLogs.find(
        (log) => log.action === 'sos.triggered' && Number(log.details.entityId) === eventId
      );
      expect(auditLogEntry).toBeDefined();
      expect(auditLogEntry.userId).toBe(elderId);
      expect(auditLogEntry.details.status).toBe('triggered');

      // 3. 社区管理屏 (adminOps) 实时刷新 SOS 报警事件列表，捕获该事件
      const adminListRes = await request(app)
        .get('/admin/sos/events')
        .set('Authorization', adminToken)
        .query({ status: 'triggered' });

      expect(adminListRes.status).toBe(200);
      expect(adminListRes.body.code).toBe(0);
      expect(adminListRes.body.data).toHaveProperty('list');
      const foundInAdmin = adminListRes.body.data.list.find((e) => e.event_id === eventId);
      expect(foundInAdmin).toBeDefined();
      expect(foundInAdmin.user_id).toBe(elderId);
      expect(foundInAdmin.address).toContain('翠竹新村3栋201室');

      // 4. 社区网格员在大屏处置并确认救助响应
      const confirmRes = await request(app)
        .put(`/admin/sos/events/${eventId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'confirmed' });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.code).toBe(0);
      expect(confirmRes.body.data.event_status).toBe('confirmed');

      // 5. 社区系统发布/调度志愿者应急支援任务
      const emergencyTaskId = 599;
      mockHarness.store.volunteerTasks.set(emergencyTaskId, {
        id: emergencyTaskId,
        title: '紧急协助：李爷爷SOS突发求助现场核实',
        elder_id: elderId,
        elder_name: '李建国',
        elder_phone: '13800001001',
        service_type: 'emergency_assistance',
        status: 'pending',
        community_id: 1,
        address: '翠竹新村3栋201室',
        volunteer_id: null,
      });

      // 6. 志愿者通过移动端刷出该紧急任务并接单
      const volunteerListRes = await request(app)
        .get('/volunteer/tasks')
        .query({ status: 'pending' })
        .set('Authorization', volunteerToken);

      expect(volunteerListRes.status).toBe(200);
      expect(volunteerListRes.body.data.list.some((t) => t.id === emergencyTaskId)).toBe(true);

      const acceptRes = await request(app)
        .post(`/volunteer/tasks/${emergencyTaskId}/accept`)
        .set('Authorization', volunteerToken);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('assigned');
      expect(acceptRes.body.data.volunteer_id).toBe(volunteerId);

      // 7. 救援与关怀处置完成，社区大屏标记结案归档
      const resolveRes = await request(app)
        .put(`/admin/sos/events/${eventId}/status`)
        .set('Authorization', adminToken)
        .send({ status: 'resolved' });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.event_status).toBe('resolved');
    });
  });

  // =========================================================================
  // 联动流 2: 用药超时未服 -> 守护全景视图预警流实时触发
  // =========================================================================
  describe('Pairwise Flow 2: 用药计划与家属全景守护预警联动', () => {
    it('TC-PAIR-02: 长辈今日慢病降压药尚未服药，家属看板呈现待服预警；长辈服药打卡后，家属端全景视图实时消警', async () => {
      // 1. 初始化今日服药时间轴
      const todayRes = await request(app)
        .get('/medication/today')
        .set('Authorization', elderToken);
      expect(todayRes.status).toBe(200);
      expect(todayRes.body.data[0].status).toBe('pending');
      const logId = todayRes.body.data[0].log_id;

      // 2. 家属端拉取长辈全景看板，观察今日用药概况
      const familyOverview1 = await request(app)
        .get('/family/elderly-overview')
        .query({ elderId })
        .set('Authorization', familyToken);

      expect(familyOverview1.status).toBe(200);
      expect(familyOverview1.body.code).toBe(0);
      expect(familyOverview1.body.data.medicationSummary.pendingTasks).toBeGreaterThanOrEqual(1);
      expect(familyOverview1.body.data.alerts.some((a) => a.type === 'medication')).toBe(true);

      // 3. 长辈在自己手机上确认服药打卡
      const confirmRes = await request(app)
        .post('/medication/confirm')
        .set('Authorization', elderToken)
        .send({ log_id: logId, status: 'taken' });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.log.status).toBe('taken');

      // 4. 家属端再次拉取全景看板，待服状态消减，已服数量增加，预警自动消退
      const familyOverview2 = await request(app)
        .get('/family/elderly-overview')
        .query({ elderId })
        .set('Authorization', familyToken);

      expect(familyOverview2.status).toBe(200);
      expect(familyOverview2.body.data.medicationSummary.completedTasks).toBeGreaterThanOrEqual(1);
      expect(familyOverview2.body.data.medicationSummary.pendingTasks).toBe(0);
      expect(familyOverview2.body.data.medicationSummary.progress).toBe(100);
      expect(familyOverview2.body.data.alerts.some((a) => a.type === 'medication')).toBe(false);
    });
  });

  // =========================================================================
  // 联动流 3: 志愿助老全流程闭环与工时存证
  // =========================================================================
  describe('Pairwise Flow 3: 助老志愿服务全周期生命流转与时间银行存证', () => {
    it('TC-PAIR-03: 工单认领 -> 现场扫码签到 -> 服务签退 -> 确认完成 -> 时间银行 (TimeBank) 工时与防伪哈希存证沉淀', async () => {
      const taskId = 501;

      // 1. 志愿者认领任务 (pending -> assigned)
      const acceptRes = await request(app)
        .post(`/volunteer/tasks/${taskId}/accept`)
        .set('Authorization', volunteerToken);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('assigned');
      expect(acceptRes.body.data.volunteer_id).toBe(volunteerId);

      // 2. 志愿者到达老人家中现场签到打卡 (assigned -> processing)
      const checkInRes = await request(app)
        .post(`/volunteer/tasks/${taskId}/check-in`)
        .set('Authorization', volunteerToken);

      expect(checkInRes.status).toBe(200);
      expect(checkInRes.body.data.status).toBe('processing');
      expect(checkInRes.body.data).toHaveProperty('check_in_at');

      // 3. 志愿者陪伴谈心、打扫与测血压完成后签退打卡 (processing -> processing 记录 checkOutAt)
      const checkOutRes = await request(app)
        .post(`/volunteer/tasks/${taskId}/check-out`)
        .set('Authorization', volunteerToken);

      expect(checkOutRes.status).toBe(200);
      expect(checkOutRes.body.data.status).toBe('processing');
      expect(checkOutRes.body.data).toHaveProperty('check_out_at');

      // 4. 提交最终工单归档结算 (processing -> completed)
      const completeRes = await request(app)
        .post(`/volunteer/tasks/${taskId}/complete`)
        .set('Authorization', volunteerToken);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('completed');
      expect(completeRes.body.data).toHaveProperty('settlement');
      expect(completeRes.body.data.settlement.status).toBe('completed');
      expect(completeRes.body.data.settlement).toHaveProperty('completed_at');

      // 5. 校验审计流水写入 volunteer.task.complete
      const completeAudit = mockHarness.store.auditLogs.find(
        (log) => log.action === 'volunteer.task.complete' && Number(log.details.order_id) === taskId
      );
      expect(completeAudit).toBeDefined();
      expect(completeAudit.userId).toBe(volunteerId);
      expect(completeAudit.details.duration_hours).toBeDefined();
    });
  });
});
