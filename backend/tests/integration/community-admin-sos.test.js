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
  getSosEvents: jest.fn(),
  updateSosEventStatus: jest.fn(),
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

function createToken(userId = 1006) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret');
}

describe('community admin SOS routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminAuth.mockImplementation((req, _res, next) => {
      req.adminScope = { communityId: 66, role: 'leader' };
      next();
    });
  });

  test('lists SOS events from the community namespace', async () => {
    communityAdminService.getSosEvents.mockResolvedValue({
      list: [
        {
          eventId: 18,
          eventStatus: 'triggered',
          triggerType: 'manual',
          notificationSummary: {
            wechat: { pending: 0, sent: 1, failed: 0 },
            sms: { pending: 1, sent: 0, failed: 0 },
            total: { pending: 1, sent: 1, failed: 0 },
          },
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    const res = await request(buildApp())
      .get('/community/sos/events')
      .query({ status: 'triggered', page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.pagination.total).toBe(1);
    expect(res.body.data.list[0].eventStatus).toBe('triggered');
    expect(communityAdminService.getSosEvents).toHaveBeenCalledWith(
      66,
      expect.objectContaining({ status: 'triggered' })
    );
  });

  test('updates SOS event status through the community namespace', async () => {
    communityAdminService.updateSosEventStatus.mockResolvedValue({
      eventId: 18,
      eventStatus: 'confirmed',
      latestStatusChangedAt: '2026-03-11T10:01:00.000Z',
    });

    const res = await request(buildApp())
      .patch('/community/sos/events/18/status')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ status: 'confirmed', reason: 'family_contacted' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.eventStatus).toBe('confirmed');
    expect(communityAdminService.updateSosEventStatus).toHaveBeenCalledWith(
      66,
      '18',
      expect.objectContaining({ status: 'confirmed', reason: 'family_contacted' }),
      expect.objectContaining({ userId: 1006 })
    );
  });

  test('rejects invalid SOS status before service layer', async () => {
    const res = await request(buildApp())
      .get('/community/sos/events')
      .query({ status: 'unknown' })
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(communityAdminService.getSosEvents).not.toHaveBeenCalled();
  });
});
