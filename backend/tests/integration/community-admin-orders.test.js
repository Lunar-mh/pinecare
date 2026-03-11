'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/middleware/adminAuth', () => jest.fn());
jest.mock('../../src/services/communityAdminService', () => ({
  getVolunteers: jest.fn(),
  getOrders: jest.fn(),
  getOrderDetail: jest.fn(),
  createOrder: jest.fn(),
  assignOrder: jest.fn(),
  updateOrderStatus: jest.fn(),
  getActivities: jest.fn(),
  createActivity: jest.fn(),
  getStats: jest.fn(),
}));

const adminAuth = require('../../src/middleware/adminAuth');
const communityAdminService = require('../../src/services/communityAdminService');
const communityRouter = require('../../src/routes/community');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/community', communityRouter);
  return app;
}

function createToken(userId = 1002) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('community admin order routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, _res, next) => {
      req.adminScope = { communityId: 66, role: 'leader' };
      next();
    });
  });

  test('lists community orders with status filter', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.getOrders.mockResolvedValue({
      list: [
        {
          id: 1,
          order_no: 'ORDER-20260221-123456',
          community_id: 66,
          status: 'pending',
        },
      ],
      pagination: { page: 1, page_size: 10, total: 1 },
    });

    const res = await request(app)
      .get('/community/orders')
      .query({ status: 'pending', page: 1, page_size: 10 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].status).toBe('pending');
    expect(communityAdminService.getOrders).toHaveBeenCalledWith(
      66,
      expect.objectContaining({ status: 'pending' })
    );
  });

  test('creates pending order with generated order number', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.createOrder.mockResolvedValue({
      id: 11,
      order_no: 'ORDER-20260221-654321',
      community_id: 66,
      service_type: 'door_visit',
      elder_id: 9001,
      volunteer_id: null,
      status: 'pending',
      scheduled_at: '2026-02-21 10:00:00',
    });

    const res = await request(app)
      .post('/community/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        service_type: 'door_visit',
        elder_id: 9001,
        scheduled_at: '2026-02-21 10:00:00',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.order_no).toMatch(/^ORDER-\d{8}-\d{6}$/);
  });

  test('returns order detail in unified envelope', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.getOrderDetail.mockResolvedValue({
      id: 5,
      order_no: 'ORDER-20260311-123456',
      status: 'assigned',
    });

    const res = await request(app)
      .get('/community/orders/5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBe(5);
  });

  test('assigns order to volunteer', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.assignOrder.mockResolvedValue({
      id: 5,
      status: 'assigned',
      volunteer_id: 2001,
    });

    const res = await request(app)
      .patch('/community/orders/5/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ volunteer_id: 2001, scheduled_at: '2026-03-11 10:00:00' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('assigned');
    expect(communityAdminService.assignOrder).toHaveBeenCalledWith(
      66,
      '5',
      expect.objectContaining({ volunteer_id: 2001 }),
      expect.objectContaining({ userId: 1002 })
    );
  });

  test('returns coded business errors for community order assignment', async () => {
    const app = buildApp();
    const token = createToken();
    const err = new Error('Volunteer does not belong to this community.');
    err.code = 403;
    err.statusCode = 403;
    communityAdminService.assignOrder.mockRejectedValue(err);

    const res = await request(app)
      .patch('/community/orders/5/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ volunteer_id: 3001, scheduled_at: '2026-03-11 10:00:00' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      code: 403,
      message: 'Volunteer does not belong to this community.',
      data: null,
    });
  });

  test('updates order status through community console', async () => {
    const app = buildApp();
    const token = createToken();

    communityAdminService.updateOrderStatus.mockResolvedValue({
      id: 5,
      status: 'cancelled',
    });

    const res = await request(app)
      .patch('/community/orders/5/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled', reason: 'schedule_conflict' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('cancelled');
  });

  test('rejects invalid order status filter before service layer', async () => {
    const app = buildApp();
    const token = createToken();

    const res = await request(app)
      .get('/community/orders')
      .query({ status: 'unknown' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 400 });
    expect(communityAdminService.getOrders).not.toHaveBeenCalled();
  });
});
