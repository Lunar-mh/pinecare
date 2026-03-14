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
  getHealthOverview: jest.fn(),
  getMedicationLogs: jest.fn(),
  updateMedicationLogStatus: jest.fn(),
  getGpsCurrent: jest.fn(),
  getGpsTrail: jest.fn(),
  getFamilyBindings: jest.fn(),
  getSosEvents: jest.fn(),
  updateSosEventStatus: jest.fn(),
  getMedicalReports: jest.fn(),
  getFallEvents: jest.fn(),
  getDrugInteractions: jest.fn(),
  updateDrugInteractionStatus: jest.fn(),
  getTimeBankServiceHistory: jest.fn(),
  confirmTimeBankService: jest.fn(),
  getTimeBankExchangeHistory: jest.fn(),
  getTimeBankLeaderboard: jest.fn(),
}));

jest.mock('../../src/models/user', () => ({
  findById: jest.fn(async (userId) => ({ id: userId, account_status: 'active' })),
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

function createToken(userId = 1005) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('community admin api contract', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'community-admin-contract-secret';
  });
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, _res, next) => {
      req.adminScope = { communityId: 101, role: 'admin' };
      next();
    });

    communityAdminService.getVolunteers.mockResolvedValue({
      list: [],
      pagination: { page: 1, page_size: 10, total: 0 },
    });
    communityAdminService.getOrders.mockResolvedValue({
      list: [],
      pagination: { page: 1, page_size: 10, total: 0 },
    });
    communityAdminService.getOrderDetail.mockResolvedValue({
      id: 1,
      order_no: 'ORDER-20260311-123456',
      status: 'pending',
    });
    communityAdminService.createOrder.mockResolvedValue({
      id: 1,
      order_no: 'ORDER-20260221-123456',
      status: 'pending',
    });
    communityAdminService.assignOrder.mockResolvedValue({
      id: 1,
      status: 'assigned',
      volunteer_id: 8,
    });
    communityAdminService.updateOrderStatus.mockResolvedValue({
      id: 1,
      status: 'cancelled',
    });
    communityAdminService.getActivities.mockResolvedValue({
      list: [],
      pagination: { page: 1, page_size: 10, total: 0 },
    });
    communityAdminService.createActivity.mockResolvedValue({ id: 1, title: '娲诲姩A' });
    communityAdminService.getStats.mockResolvedValue({
      overview: { active_elders: 0, volunteers: 0, total_orders: 0, total_service_hours: 0 },
      order_distribution: {
        pending: 0,
        assigned: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
      },
    });
    communityAdminService.getHealthOverview.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.getMedicationLogs.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.updateMedicationLogStatus.mockResolvedValue({
      id: 1,
      status: 'taken',
      actualTime: '2026-03-11T10:00:00.000Z',
    });
    communityAdminService.getGpsCurrent.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.getGpsTrail.mockResolvedValue({
      userId: 1,
      total: 0,
      list: [],
    });
    communityAdminService.getFamilyBindings.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.getSosEvents.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.updateSosEventStatus.mockResolvedValue({
      eventId: 1,
      eventStatus: 'confirmed',
      latestStatusChangedAt: '2026-03-11T10:01:00.000Z',
    });
    communityAdminService.getMedicalReports.mockResolvedValue({
      source: 'admin',
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.getFallEvents.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.getDrugInteractions.mockResolvedValue([]);
    communityAdminService.updateDrugInteractionStatus.mockResolvedValue({
      id: 1,
      status: 'acknowledged',
    });
    communityAdminService.getTimeBankServiceHistory.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    });
    communityAdminService.confirmTimeBankService.mockResolvedValue({
      recordId: 1,
      status: 'confirmed',
    });
    communityAdminService.getTimeBankExchangeHistory.mockResolvedValue([]);
    communityAdminService.getTimeBankLeaderboard.mockResolvedValue([]);
  });

  test('returns 401 for all protected endpoints without token', async () => {
    const app = buildApp();
    const endpoints = [
      { method: 'get', path: '/community/volunteers' },
      { method: 'get', path: '/community/orders' },
      { method: 'get', path: '/community/orders/1' },
      { method: 'post', path: '/community/orders', body: { service_type: 'visit', elder_id: 1 } },
      { method: 'patch', path: '/community/orders/1/assign', body: { volunteer_id: 8 } },
      { method: 'patch', path: '/community/orders/1/status', body: { status: 'cancelled' } },
      { method: 'get', path: '/community/activities' },
      {
        method: 'post',
        path: '/community/activities',
        body: {
          title: '璁插骇',
          content: '鍋ュ悍璁插骇',
          start_time: '2026-03-01 09:00:00',
          end_time: '2026-03-01 10:00:00',
        },
      },
      { method: 'get', path: '/community/stats' },
      { method: 'get', path: '/community/health/overview' },
      { method: 'get', path: '/community/medication/logs' },
      {
        method: 'put',
        path: '/community/medication/logs/1/status',
        body: { status: 'taken' },
      },
      { method: 'get', path: '/community/gps/current' },
      {
        method: 'get',
        path: '/community/gps/trail?userId=1&startDate=2026-03-01T00:00:00.000Z&endDate=2026-03-01T12:00:00.000Z',
      },
      { method: 'get', path: '/community/family/bindings' },
      { method: 'get', path: '/community/sos/events' },
      {
        method: 'patch',
        path: '/community/sos/events/1/status',
        body: { status: 'confirmed' },
      },
      { method: 'get', path: '/community/medical/reports' },
      { method: 'get', path: '/community/fall/events' },
      { method: 'get', path: '/community/drug-interactions' },
      {
        method: 'put',
        path: '/community/drug-interactions/1/status',
        body: { status: 'acknowledged' },
      },
      { method: 'get', path: '/community/time-bank/service/history' },
      {
        method: 'post',
        path: '/community/time-bank/service/confirm',
        body: { recordId: 1, action: 'confirm' },
      },
      { method: 'get', path: '/community/time-bank/exchange/history' },
      { method: 'get', path: '/community/time-bank/leaderboard' },
    ];

    for (const item of endpoints) {
      let req = request(app)[item.method](item.path);
      if (item.body) {
        req = req.send(item.body);
      }
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ code: 401 });
    }
  });

  test('all endpoints return unified envelope after login', async () => {
    const app = buildApp();
    const token = createToken();

    const responses = [];
    responses.push(
      await request(app).get('/community/volunteers').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/orders').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/orders/1').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .post('/community/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ service_type: 'visit', elder_id: 1 })
    );
    responses.push(
      await request(app)
        .patch('/community/orders/1/assign')
        .set('Authorization', `Bearer ${token}`)
        .send({ volunteer_id: 8 })
    );
    responses.push(
      await request(app)
        .patch('/community/orders/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'cancelled' })
    );
    responses.push(
      await request(app).get('/community/activities').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .post('/community/activities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '璁插骇',
          content: '鍋ュ悍璁插骇',
          start_time: '2026-03-01 09:00:00',
          end_time: '2026-03-01 10:00:00',
        })
    );
    responses.push(
      await request(app).get('/community/stats').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/health/overview').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/medication/logs').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .put('/community/medication/logs/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'taken' })
    );
    responses.push(
      await request(app).get('/community/gps/current').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .get(
          '/community/gps/trail?userId=1&startDate=2026-03-01T00:00:00.000Z&endDate=2026-03-01T12:00:00.000Z'
        )
        .set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/family/bindings').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/sos/events').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .patch('/community/sos/events/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' })
    );
    responses.push(
      await request(app).get('/community/medical/reports').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/fall/events').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app).get('/community/drug-interactions').set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .put('/community/drug-interactions/1/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'acknowledged' })
    );
    responses.push(
      await request(app)
        .get('/community/time-bank/service/history')
        .set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .post('/community/time-bank/service/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordId: 1, action: 'confirm' })
    );
    responses.push(
      await request(app)
        .get('/community/time-bank/exchange/history')
        .set('Authorization', `Bearer ${token}`)
    );
    responses.push(
      await request(app)
        .get('/community/time-bank/leaderboard')
        .set('Authorization', `Bearer ${token}`)
    );

    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(typeof res.body.code).toBe('number');
      expect(typeof res.body.message).toBe('string');
      expect(Object.prototype.hasOwnProperty.call(res.body, 'data')).toBe(true);
    });
  });
});
