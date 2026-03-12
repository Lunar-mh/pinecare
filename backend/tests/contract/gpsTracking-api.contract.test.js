'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { userId: 1001 };
  next();
});

jest.mock('../../src/services/locationService', () => ({
  upload: jest.fn(),
  getCurrent: jest.fn(),
}));

jest.mock('../../src/services/locationTrailService', () => ({
  getTrail: jest.fn(),
}));

jest.mock('../../src/controllers/fenceController', () => ({
  list: jest.fn((_req, res) => res.json({ code: 0, message: 'ok', data: [] })),
  create: jest.fn((_req, res) => res.json({ code: 0, message: 'ok', data: { id: 1 } })),
  update: jest.fn((_req, res) => res.json({ code: 0, message: 'ok', data: { id: 1 } })),
  remove: jest.fn((_req, res) => res.json({ code: 0, message: 'ok', data: null })),
  toggle: jest.fn((_req, res) => res.json({ code: 0, message: 'ok', data: { id: 1, enabled: true } })),
}));

jest.mock('../../src/controllers/alertController', () => ({
  list: jest.fn((_req, res) => res.json({ code: 0, message: 'ok', data: [] })),
}));

const locationService = require('../../src/services/locationService');
const locationTrailService = require('../../src/services/locationTrailService');
const router = require('../../src/routes/gpsTracking');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/gps', router);
  return app;
}

describe('gps tracking route validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationService.upload.mockResolvedValue({ location: { latitude: 31.2, longitude: 121.5 } });
    locationTrailService.getTrail.mockResolvedValue({ list: [], total: 0 });
  });

  it('rejects invalid upload payloads before hitting services', async () => {
    const res = await request(createApp()).post('/gps/upload').send({ latitude: 120, longitude: 121.5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('latitude must be between -90 and 90.');
    expect(locationService.upload).not.toHaveBeenCalled();
  });

  it('forwards normalized trail queries to the service', async () => {
    const res = await request(createApp()).get('/gps/trail?startDate=2026-03-01&endDate=2026-03-12&limit=50');

    expect(res.status).toBe(200);
    expect(locationTrailService.getTrail).toHaveBeenCalledWith(1001, {
      startDate: '2026-03-01',
      endDate: '2026-03-12',
      limit: 50,
    });
  });

  it('rejects invalid fence identifiers before controller execution', async () => {
    const res = await request(createApp()).put('/gps/fences/oops/toggle').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('fenceId must be a positive integer.');
  });
});
