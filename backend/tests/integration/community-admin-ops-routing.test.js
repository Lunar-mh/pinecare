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

const adminAuth = require('../../src/middleware/adminAuth');
const communityAdminService = require('../../src/services/communityAdminService');
const communityRouter = require('../../src/routes/community');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/community', communityRouter);
  return app;
}

function createToken(userId = 1007) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('community admin operational routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, _res, next) => {
      req.adminScope = { communityId: 77, role: 'leader' };
      next();
    });
  });

  test('lists health overview from the community namespace', async () => {
    communityAdminService.getHealthOverview.mockResolvedValue({
      list: [{ userId: 1, riskLevel: 'warning' }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    const res = await request(buildApp())
      .get('/community/health/overview')
      .query({ page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].riskLevel).toBe('warning');
    expect(communityAdminService.getHealthOverview).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ page: '1', pageSize: '10' })
    );
  });

  test('lists medication logs and updates status from the community namespace', async () => {
    communityAdminService.getMedicationLogs.mockResolvedValue({
      list: [{ id: 11, status: 'pending', medicationName: 'Aspirin' }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    communityAdminService.updateMedicationLogStatus.mockResolvedValue({
      id: 11,
      status: 'taken',
      actualTime: '2026-03-11T10:00:00.000Z',
    });

    const listRes = await request(buildApp())
      .get('/community/medication/logs')
      .query({ status: 'pending' })
      .set('Authorization', `Bearer ${createToken()}`);

    const updateRes = await request(buildApp())
      .put('/community/medication/logs/11/status')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ status: 'taken' });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.list[0].medicationName).toBe('Aspirin');
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('taken');
    expect(communityAdminService.updateMedicationLogStatus).toHaveBeenCalledWith(
      77,
      '11',
      expect.objectContaining({ status: 'taken' }),
      expect.objectContaining({ userId: 1007 })
    );
  });

  test('lists gps current and trail from the community namespace', async () => {
    communityAdminService.getGpsCurrent.mockResolvedValue({
      list: [{ userId: 9, latitude: 31.2, longitude: 121.4 }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    communityAdminService.getGpsTrail.mockResolvedValue({
      userId: 9,
      total: 1,
      list: [{ id: 1, latitude: 31.2, longitude: 121.4 }],
    });

    const currentRes = await request(buildApp())
      .get('/community/gps/current')
      .set('Authorization', `Bearer ${createToken()}`);

    const trailRes = await request(buildApp())
      .get('/community/gps/trail')
      .query({
        userId: 9,
        startDate: '2026-03-11T00:00:00.000Z',
        endDate: '2026-03-11T12:00:00.000Z',
      })
      .set('Authorization', `Bearer ${createToken()}`);

    expect(currentRes.status).toBe(200);
    expect(currentRes.body.data.list[0].userId).toBe(9);
    expect(trailRes.status).toBe(200);
    expect(trailRes.body.data.total).toBe(1);
  });

  test('lists family bindings from the community namespace', async () => {
    communityAdminService.getFamilyBindings.mockResolvedValue({
      list: [{ bindingId: 31, elderId: 8 }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    const res = await request(buildApp())
      .get('/community/family/bindings')
      .query({ page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].bindingId).toBe(31);
  });

  test('lists medical reports and fall events from the community namespace', async () => {
    communityAdminService.getMedicalReports.mockResolvedValue({
      source: 'admin',
      list: [{ id: 15, reportType: 'exam' }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    communityAdminService.getFallEvents.mockResolvedValue({
      list: [{ id: 19, status: 'confirmed' }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    const reportsRes = await request(buildApp())
      .get('/community/medical/reports')
      .set('Authorization', `Bearer ${createToken()}`);
    const fallsRes = await request(buildApp())
      .get('/community/fall/events')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.data.list[0].reportType).toBe('exam');
    expect(fallsRes.status).toBe(200);
    expect(fallsRes.body.data.list[0].status).toBe('confirmed');
  });

  test('lists and updates drug interactions from the community namespace', async () => {
    communityAdminService.getDrugInteractions.mockResolvedValue([
      { id: 22, status: 'pending', drugA: 'Aspirin', drugB: 'Warfarin' },
    ]);
    communityAdminService.updateDrugInteractionStatus.mockResolvedValue({
      id: 22,
      status: 'acknowledged',
    });

    const listRes = await request(buildApp())
      .get('/community/drug-interactions')
      .query({ status: 'pending', limit: 20 })
      .set('Authorization', `Bearer ${createToken()}`);
    const updateRes = await request(buildApp())
      .put('/community/drug-interactions/22/status')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ status: 'acknowledged' });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data[0].drugA).toBe('Aspirin');
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('acknowledged');
    expect(communityAdminService.updateDrugInteractionStatus).toHaveBeenCalledWith(
      77,
      '22',
      expect.objectContaining({ status: 'acknowledged' }),
      expect.objectContaining({ userId: 1007 })
    );
  });

  test('lists and settles time bank records from the community namespace', async () => {
    communityAdminService.getTimeBankServiceHistory.mockResolvedValue({
      list: [{ id: 31, status: 'pending', serviceType: 'escort' }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
    communityAdminService.confirmTimeBankService.mockResolvedValue({
      recordId: 31,
      status: 'confirmed',
    });
    communityAdminService.getTimeBankExchangeHistory.mockResolvedValue([
      { id: 41, status: 'completed' },
    ]);
    communityAdminService.getTimeBankLeaderboard.mockResolvedValue([
      { rank: 1, userId: 12, balance: 18 },
    ]);

    const historyRes = await request(buildApp())
      .get('/community/time-bank/service/history')
      .set('Authorization', `Bearer ${createToken()}`);
    const confirmRes = await request(buildApp())
      .post('/community/time-bank/service/confirm')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ recordId: 31, action: 'confirm' });
    const exchangeRes = await request(buildApp())
      .get('/community/time-bank/exchange/history')
      .set('Authorization', `Bearer ${createToken()}`);
    const leaderboardRes = await request(buildApp())
      .get('/community/time-bank/leaderboard')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.list[0].serviceType).toBe('escort');
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('confirmed');
    expect(exchangeRes.status).toBe(200);
    expect(exchangeRes.body.data[0].status).toBe('completed');
    expect(leaderboardRes.status).toBe(200);
    expect(leaderboardRes.body.data[0].rank).toBe(1);
  });
});
