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

jest.mock('../../src/services/statisticsService', () => ({
  getCommunityDashboardStats: jest.fn(),
}));

jest.mock('../../src/models/auditLog', () => ({
  create: jest.fn(),
}));

const communityAdminModel = require('../../src/models/communityAdmin');
const AuditLogModel = require('../../src/models/auditLog');
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
    communityAdminModel.findVolunteerInCommunity.mockResolvedValue({ user_id: 22, role: 'volunteer' });
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
});
