'use strict';

const loadModel = () => {
  jest.resetModules();
  jest.doMock('../../src/config/database', () => ({
    query: jest.fn(),
  }));

  const db = require('../../src/config/database');
  const model = require('../../src/models/communityAdmin');
  return { model, query: db.query };
};

describe('communityAdmin model', () => {
  it('generates order numbers in the expected shape', () => {
    const { model } = loadModel();
    expect(model.generateOrderNo()).toMatch(/^ORDER-\d{8}-\d{6}$/);
  });

  it('lists and counts volunteers with keyword filters', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 1 }]]);
    query.mockResolvedValueOnce([[{ total: 3 }]]);

    const list = await model.listVolunteers(9, { keyword: 'ann' }, { page: 2, pageSize: 5 });
    const total = await model.countVolunteers(9, { keyword: 'ann' });

    expect(list).toEqual([{ id: 1 }]);
    expect(total).toBe(3);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("ca.role = 'volunteer'"),
      [9, '%ann%', '%ann%', 5, 5]
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('COUNT(1) AS total'),
      [9, '%ann%', '%ann%']
    );
  });

  it('lists and counts orders with composed filters', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 5 }]]);
    query.mockResolvedValueOnce([[{ total: 7 }]]);

    const filters = {
      status: 'pending',
      serviceType: 'escort',
      elderId: 11,
      volunteerId: 22,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    };

    const list = await model.listOrders(9, filters, { page: 1, pageSize: 10 });
    const total = await model.countOrders(9, filters);

    expect(list).toEqual([{ id: 5 }]);
    expect(total).toBe(7);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM service_orders so'),
      [9, 'pending', 'escort', 11, 22, '2026-03-01', '2026-03-31', 10, 0]
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('COUNT(1) AS total'),
      [9, 'pending', 'escort', 11, 22, '2026-03-01', '2026-03-31']
    );
  });

  it('finds volunteer and order details by ids', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ user_id: 8 }]]);
    query.mockResolvedValueOnce([[{ id: 10 }]]);

    await expect(model.findVolunteerInCommunity(9, 8)).resolves.toEqual({ user_id: 8 });
    await expect(model.findOrderById(9, 10)).resolves.toEqual({ id: 10 });
  });

  it('creates an order and retries on duplicate key collisions', async () => {
    const { model, query } = loadModel();
    const duplicateErr = new Error('dup');
    duplicateErr.code = 'ER_DUP_ENTRY';

    query
      .mockRejectedValueOnce(duplicateErr)
      .mockResolvedValueOnce([{ insertId: 99 }]);

    const result = await model.createOrder({
      orderNo: 'ORDER-20260311-000001',
      communityId: 9,
      serviceType: 'escort',
      elderId: 5,
      volunteerId: 8,
      status: 'pending',
      scheduledAt: '2026-03-11 10:00:00',
      completedAt: null,
    });

    expect(result).toMatchObject({
      id: 99,
      community_id: 9,
      service_type: 'escort',
      elder_id: 5,
      volunteer_id: 8,
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('throws the last error when order creation keeps colliding', async () => {
    const { model, query } = loadModel();
    const duplicateErr = new Error('dup');
    duplicateErr.code = 'ER_DUP_ENTRY';
    query.mockRejectedValue(duplicateErr);

    await expect(
      model.createOrder({
        communityId: 9,
        serviceType: 'escort',
        elderId: 5,
      })
    ).rejects.toBe(duplicateErr);

    expect(query).toHaveBeenCalledTimes(8);
  });

  it('assigns and updates orders with optional fields', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const assignResult = await model.assignOrder(9, 8, 22, '2026-03-11 10:00:00');
    const updateResult = await model.updateOrderStatus(9, 8, 'completed', {
      completedAt: '2026-03-11 11:00:00',
      volunteerId: 22,
    });

    expect(assignResult.affectedRows).toBe(1);
    expect(updateResult.affectedRows).toBe(1);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET status = ?, completed_at = ?, volunteer_id = ?'),
      ['completed', '2026-03-11 11:00:00', 22, 9, 8]
    );
  });

  it('lists, counts, and creates activities', async () => {
    const { model, query } = loadModel();
    query.mockResolvedValueOnce([[{ id: 1 }]]);
    query.mockResolvedValueOnce([[{ total: 4 }]]);
    query.mockResolvedValueOnce([{ insertId: 7 }]);

    const filters = {
      keyword: 'choir',
      startTime: '2026-03-11 09:00:00',
      endTime: '2026-03-11 12:00:00',
    };

    const list = await model.listActivities(9, filters, { page: 2, pageSize: 3 });
    const total = await model.countActivities(9, filters);
    const created = await model.createActivity({
      communityId: 9,
      title: 'Morning Choir',
      content: 'Sing together',
      startTime: '2026-03-11 09:00:00',
      endTime: '2026-03-11 10:00:00',
      maxParticipants: 20,
    });

    expect(list).toEqual([{ id: 1 }]);
    expect(total).toBe(4);
    expect(created).toMatchObject({
      id: 7,
      title: 'Morning Choir',
      registered_count: 0,
    });
  });

  it('builds community stats overview and distribution', async () => {
    const { model, query } = loadModel();
    query
      .mockResolvedValueOnce([
        [
          {
            active_elders: 2,
            volunteers: 5,
            total_orders: 6,
            total_service_hours: 4.5,
          },
        ],
      ])
      .mockResolvedValueOnce([[{ status: 'pending', count: 2 }, { status: 'completed', count: 4 }]]);

    const result = await model.getStatsData(9);

    expect(result).toEqual({
      overview: {
        active_elders: 2,
        volunteers: 5,
        total_orders: 6,
        total_service_hours: 4.5,
      },
      order_distribution: {
        pending: 2,
        assigned: 0,
        processing: 0,
        completed: 4,
        cancelled: 0,
      },
    });
  });
});
