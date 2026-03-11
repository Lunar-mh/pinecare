'use strict';

jest.mock('../../src/models/communityAdmin', () => ({
  generateOrderNo: jest.fn(() => 'ORDER-20260311-000001'),
  listVolunteers: jest.fn(),
  countVolunteers: jest.fn(),
  listOrders: jest.fn(),
  countOrders: jest.fn(),
  findVolunteerInCommunity: jest.fn(),
  findOrderById: jest.fn(),
  createOrder: jest.fn(),
  assignOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
  listActivities: jest.fn(),
  countActivities: jest.fn(),
  createActivity: jest.fn(),
}));

jest.mock('../../src/models/adminOpsModel', () => ({
  listSosEvents: jest.fn(),
  countSosEvents: jest.fn(),
  summarizeSosNotifications: jest.fn(),
  getSosEventById: jest.fn(),
  updateSosEventStatus: jest.fn(),
}));

jest.mock('../../src/services/statisticsService', () => ({
  getCommunityDashboardStats: jest.fn(),
}));

jest.mock('../../src/services/adminOpsService', () => ({
  getHealthOverview: jest.fn(),
  getMedicationLogs: jest.fn(),
  updateMedicationLogStatus: jest.fn(),
  getGpsCurrent: jest.fn(),
  getGpsTrail: jest.fn(),
  getFamilyBindings: jest.fn(),
  getMedicalReports: jest.fn(),
  getFallEvents: jest.fn(),
  getDrugInteractions: jest.fn(),
  updateDrugInteractionStatus: jest.fn(),
  getTimeBankServiceHistory: jest.fn(),
  confirmTimeBankService: jest.fn(),
  getTimeBankExchangeHistory: jest.fn(),
  getTimeBankLeaderboard: jest.fn(),
}));

jest.mock('../../src/models/auditLog', () => ({
  create: jest.fn(),
}));

const communityAdminModel = require('../../src/models/communityAdmin');
const adminOpsModel = require('../../src/models/adminOpsModel');
const AuditLogModel = require('../../src/models/auditLog');
const adminOpsService = require('../../src/services/adminOpsService');
const statisticsService = require('../../src/services/statisticsService');
const communityAdminService = require('../../src/services/communityAdminService');

describe('communityAdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects volunteer query without community scope', async () => {
    await expect(communityAdminService.getVolunteers(null, {})).rejects.toMatchObject({
      code: 403,
    });
  });

  it('returns paged volunteers with normalized pagination', async () => {
    communityAdminModel.listVolunteers.mockResolvedValue([{ id: 1 }]);
    communityAdminModel.countVolunteers.mockResolvedValue(1);

    const result = await communityAdminService.getVolunteers(9, {
      page: '0',
      pageSize: '200',
      keyword: 'alice',
    });

    expect(communityAdminModel.listVolunteers).toHaveBeenCalledWith(
      9,
      { keyword: 'alice' },
      { page: 1, pageSize: 100 }
    );
    expect(result.pagination.total).toBe(1);
  });

  it('rejects invalid order status filter', async () => {
    await expect(
      communityAdminService.getOrders(9, {
        status: 'unknown',
      })
    ).rejects.toMatchObject({ code: 400 });
  });

  it('creates order with trimmed service type and generated order no', async () => {
    communityAdminModel.createOrder.mockResolvedValue({
      id: 3,
      order_no: 'ORDER-20260311-000001',
      status: 'pending',
    });

    const result = await communityAdminService.createOrder(9, {
      service_type: ' escort ',
      elder_id: '12',
      volunteer_id: '22',
    });

    expect(communityAdminModel.createOrder).toHaveBeenCalledWith({
      orderNo: 'ORDER-20260311-000001',
      communityId: 9,
      serviceType: 'escort',
      elderId: 12,
      volunteerId: 22,
      status: 'pending',
      scheduledAt: null,
      completedAt: null,
    });
    expect(result.status).toBe('pending');
  });

  it('returns order detail by community scope', async () => {
    communityAdminModel.findOrderById.mockResolvedValue({
      id: 9,
      status: 'pending',
    });

    const result = await communityAdminService.getOrderDetail(9, 9);

    expect(communityAdminModel.findOrderById).toHaveBeenCalledWith(9, 9);
    expect(result.id).toBe(9);
  });

  it('assigns pending order to volunteer in the same community and writes audit log', async () => {
    communityAdminModel.findOrderById
      .mockResolvedValueOnce({ id: 8, status: 'pending', volunteer_id: null })
      .mockResolvedValueOnce({ id: 8, status: 'assigned', volunteer_id: 22 });
    communityAdminModel.findVolunteerInCommunity.mockResolvedValue({
      user_id: 22,
      role: 'volunteer',
    });
    communityAdminModel.assignOrder.mockResolvedValue({ affectedRows: 1 });
    AuditLogModel.create.mockResolvedValue(1);

    const result = await communityAdminService.assignOrder(
      9,
      8,
      {
        volunteer_id: 22,
        scheduled_at: '2026-03-11 10:00:00',
      },
      { userId: 1, role: 'leader' }
    );

    expect(communityAdminModel.findVolunteerInCommunity).toHaveBeenCalledWith(9, 22);
    expect(communityAdminModel.assignOrder).toHaveBeenCalledWith(9, 8, 22, '2026-03-11 10:00:00');
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'community.order.assign',
      })
    );
    expect(result.status).toBe('assigned');
  });

  it('cancels active order and records status transition', async () => {
    communityAdminModel.findOrderById
      .mockResolvedValueOnce({ id: 7, status: 'processing', volunteer_id: 22 })
      .mockResolvedValueOnce({ id: 7, status: 'cancelled', volunteer_id: 22 });
    communityAdminModel.updateOrderStatus.mockResolvedValue({ affectedRows: 1 });
    AuditLogModel.create.mockResolvedValue(1);

    const result = await communityAdminService.updateOrderStatus(
      9,
      7,
      { status: 'cancelled', reason: 'manual_intervention' },
      { userId: 1, role: 'leader' }
    );

    expect(communityAdminModel.updateOrderStatus).toHaveBeenCalledWith(9, 7, 'cancelled', {});
    expect(result.status).toBe('cancelled');
  });

  it('validates activity time ordering and max participants', async () => {
    await expect(
      communityAdminService.createActivity(9, {
        title: 'Activity',
        content: 'Body',
        start_time: '2026-03-11T10:00:00Z',
        end_time: '2026-03-11T09:00:00Z',
      })
    ).rejects.toMatchObject({ code: 400 });

    await expect(
      communityAdminService.createActivity(9, {
        title: 'Activity',
        content: 'Body',
        start_time: '2026-03-11T09:00:00Z',
        end_time: '2026-03-11T10:00:00Z',
        max_participants: '0',
      })
    ).rejects.toMatchObject({ code: 400 });
  });

  it('creates activity with normalized participants', async () => {
    communityAdminModel.createActivity.mockResolvedValue({ id: 7, title: 'Activity' });

    const result = await communityAdminService.createActivity(9, {
      title: ' Activity ',
      content: ' Body ',
      start_time: '2026-03-11T09:00:00Z',
      end_time: '2026-03-11T10:00:00Z',
      max_participants: '20',
    });

    expect(communityAdminModel.createActivity).toHaveBeenCalledWith({
      communityId: 9,
      title: 'Activity',
      content: 'Body',
      startTime: '2026-03-11T09:00:00Z',
      endTime: '2026-03-11T10:00:00Z',
      maxParticipants: 20,
    });
    expect(result.id).toBe(7);
  });

  it('validates stats date range before delegating', async () => {
    await expect(
      communityAdminService.getStats(9, {
        start_date: 'bad-date',
      })
    ).rejects.toMatchObject({ code: 400 });

    await expect(
      communityAdminService.getStats(9, {
        start_date: '2026-03-12',
        end_date: '2026-03-11',
      })
    ).rejects.toMatchObject({ code: 400 });
  });

  it('delegates stats aggregation to unified statistics service', async () => {
    statisticsService.getCommunityDashboardStats.mockResolvedValue({
      overview: { active_elders: 2 },
      order_distribution: { pending: 1 },
    });

    const result = await communityAdminService.getStats(9, {
      start_date: '2026-03-01',
      end_date: '2026-03-31',
    });

    expect(statisticsService.getCommunityDashboardStats).toHaveBeenCalledWith(9);
    expect(result.overview.active_elders).toBe(2);
  });

  it('delegates health overview into the scoped admin ops service', async () => {
    adminOpsService.getHealthOverview.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    const result = await communityAdminService.getHealthOverview(9, { page: '1', pageSize: '10' });

    expect(adminOpsService.getHealthOverview).toHaveBeenCalledWith({
      page: '1',
      pageSize: '10',
      communityId: 9,
    });
    expect(result.pagination.total).toBe(0);
  });

  it('delegates medication logs into the scoped admin ops service', async () => {
    adminOpsService.getMedicationLogs.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    await communityAdminService.getMedicationLogs(9, { status: 'pending' });

    expect(adminOpsService.getMedicationLogs).toHaveBeenCalledWith({
      status: 'pending',
      communityId: 9,
    });
  });

  it('updates medication log status and writes community audit log', async () => {
    adminOpsService.updateMedicationLogStatus.mockResolvedValue({
      id: 11,
      status: 'taken',
      actualTime: '2026-03-11T10:00:00.000Z',
    });
    AuditLogModel.create.mockResolvedValue(1);

    const result = await communityAdminService.updateMedicationLogStatus(
      9,
      11,
      { status: 'taken' },
      { userId: 1, role: 'leader' }
    );

    expect(adminOpsService.updateMedicationLogStatus).toHaveBeenCalledWith(11, {
      status: 'taken',
      communityId: 9,
    });
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'community.medication.log_status_update',
      })
    );
    expect(result.status).toBe('taken');
  });

  it('delegates gps current and trail into the scoped admin ops service', async () => {
    adminOpsService.getGpsCurrent.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    adminOpsService.getGpsTrail.mockResolvedValue({
      userId: 88,
      total: 0,
      list: [],
    });

    await communityAdminService.getGpsCurrent(9, { page: '1' });
    await communityAdminService.getGpsTrail(9, {
      userId: '88',
      startDate: '2026-03-11T00:00:00.000Z',
      endDate: '2026-03-11T12:00:00.000Z',
    });

    expect(adminOpsService.getGpsCurrent).toHaveBeenCalledWith({
      page: '1',
      communityId: 9,
    });
    expect(adminOpsService.getGpsTrail).toHaveBeenCalledWith({
      userId: '88',
      startDate: '2026-03-11T00:00:00.000Z',
      endDate: '2026-03-11T12:00:00.000Z',
      communityId: 9,
    });
  });

  it('delegates family bindings into the scoped admin ops service', async () => {
    adminOpsService.getFamilyBindings.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    await communityAdminService.getFamilyBindings(9, { search: 'elder' });

    expect(adminOpsService.getFamilyBindings).toHaveBeenCalledWith({
      search: 'elder',
      communityId: 9,
    });
  });

  it('lists community SOS events with frozen camelCase summaries', async () => {
    adminOpsModel.listSosEvents.mockResolvedValue([
      {
        id: 18,
        user_id: 2001,
        nickname: 'Wang Ayi',
        phone: '13800000000',
        event_status: 'triggered',
        trigger_type: 'manual',
        latitude: 30.1,
        longitude: 120.1,
        address: 'Hangzhou Xihu',
        created_at: '2026-03-11 10:00:00',
        confirmed_at: null,
        resolved_at: null,
        cancelled_at: null,
      },
    ]);
    adminOpsModel.countSosEvents.mockResolvedValue(1);
    adminOpsModel.summarizeSosNotifications.mockResolvedValue([
      { sos_event_id: 18, notify_type: 'wechat', pending_count: 0, sent_count: 1, failed_count: 0 },
      { sos_event_id: 18, notify_type: 'sms', pending_count: 1, sent_count: 0, failed_count: 0 },
    ]);

    const result = await communityAdminService.getSosEvents(9, {
      page: '1',
      pageSize: '10',
      status: 'triggered',
    });

    expect(adminOpsModel.listSosEvents).toHaveBeenCalledWith(
      { search: '', status: 'triggered', communityId: 9 },
      { pageSize: 10, offset: 0 }
    );
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.list[0]).toMatchObject({
      eventId: 18,
      eventStatus: 'triggered',
      triggerType: 'manual',
    });
    expect(result.list[0].notificationSummary.total.sent).toBe(1);
  });

  it('updates community SOS status with strict state machine and audit log', async () => {
    adminOpsModel.getSosEventById
      .mockResolvedValueOnce({
        id: 18,
        user_id: 2001,
        event_status: 'triggered',
        trigger_type: 'manual',
        created_at: '2026-03-11 10:00:00',
      })
      .mockResolvedValueOnce({
        id: 18,
        user_id: 2001,
        nickname: 'Wang Ayi',
        phone: '13800000000',
        event_status: 'confirmed',
        trigger_type: 'manual',
        latitude: 30.1,
        longitude: 120.1,
        address: 'Hangzhou Xihu',
        created_at: '2026-03-11 10:00:00',
        confirmed_at: '2026-03-11 10:01:00',
        resolved_at: null,
        cancelled_at: null,
      });
    adminOpsModel.updateSosEventStatus.mockResolvedValue(1);
    adminOpsModel.summarizeSosNotifications.mockResolvedValue([]);
    AuditLogModel.create.mockResolvedValue(1);

    const result = await communityAdminService.updateSosEventStatus(
      9,
      18,
      { status: 'confirmed', reason: 'family_contacted' },
      { userId: 1, role: 'leader' }
    );

    expect(adminOpsModel.updateSosEventStatus).toHaveBeenCalledWith(18, 'triggered', 'confirmed');
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'community.sos.confirm',
      })
    );
    expect(result.eventStatus).toBe('confirmed');
  });

  it('delegates medical reports and fall events into the scoped admin ops service', async () => {
    adminOpsService.getMedicalReports.mockResolvedValue({
      source: 'admin',
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    adminOpsService.getFallEvents.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });

    await communityAdminService.getMedicalReports(9, { reportType: 'exam' });
    await communityAdminService.getFallEvents(9, { status: 'confirmed' });

    expect(adminOpsService.getMedicalReports).toHaveBeenCalledWith({
      reportType: 'exam',
      communityId: 9,
    });
    expect(adminOpsService.getFallEvents).toHaveBeenCalledWith({
      status: 'confirmed',
      communityId: 9,
    });
  });

  it('delegates drug interactions and writes community audit when status changes', async () => {
    adminOpsService.getDrugInteractions.mockResolvedValue([]);
    adminOpsService.updateDrugInteractionStatus.mockResolvedValue({
      id: 21,
      status: 'acknowledged',
    });
    AuditLogModel.create.mockResolvedValue(1);

    await communityAdminService.getDrugInteractions(9, { status: 'pending', limit: '20' });
    const result = await communityAdminService.updateDrugInteractionStatus(
      9,
      21,
      { status: 'acknowledged' },
      { userId: 1, role: 'leader' }
    );

    expect(adminOpsService.getDrugInteractions).toHaveBeenCalledWith({
      status: 'pending',
      limit: '20',
      communityId: 9,
    });
    expect(adminOpsService.updateDrugInteractionStatus).toHaveBeenCalledWith(21, {
      status: 'acknowledged',
      communityId: 9,
    });
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'community.drug_interaction.status_update',
      })
    );
    expect(result.status).toBe('acknowledged');
  });

  it('delegates time bank history, settlement, exchange history and leaderboard', async () => {
    adminOpsService.getTimeBankServiceHistory.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    adminOpsService.confirmTimeBankService.mockResolvedValue({
      recordId: 31,
      status: 'confirmed',
    });
    adminOpsService.getTimeBankExchangeHistory.mockResolvedValue([]);
    adminOpsService.getTimeBankLeaderboard.mockResolvedValue([]);
    AuditLogModel.create.mockResolvedValue(1);

    await communityAdminService.getTimeBankServiceHistory(9, { status: 'pending' });
    const settlement = await communityAdminService.confirmTimeBankService(
      9,
      { recordId: 31, action: 'confirm' },
      { userId: 1, role: 'leader' }
    );
    await communityAdminService.getTimeBankExchangeHistory(9, { limit: '50' });
    await communityAdminService.getTimeBankLeaderboard(9, { limit: '20' });

    expect(adminOpsService.getTimeBankServiceHistory).toHaveBeenCalledWith({
      status: 'pending',
      communityId: 9,
    });
    expect(adminOpsService.confirmTimeBankService).toHaveBeenCalledWith({
      recordId: 31,
      action: 'confirm',
      communityId: 9,
    });
    expect(adminOpsService.getTimeBankExchangeHistory).toHaveBeenCalledWith({
      limit: '50',
      communityId: 9,
    });
    expect(adminOpsService.getTimeBankLeaderboard).toHaveBeenCalledWith({
      limit: '20',
      communityId: 9,
    });
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'community.time_bank.service_settle',
      })
    );
    expect(settlement.status).toBe('confirmed');
  });
});
