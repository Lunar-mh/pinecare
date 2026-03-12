'use strict';

jest.mock('../../src/services/healthArchiveService', () => ({
  getToday: jest.fn(),
  getTrend: jest.fn(),
  getLatestBloodPressure: jest.fn(),
  getLatestHeartRate: jest.fn(),
}));

jest.mock('../../src/services/healthSyncService', () => ({
  sync: jest.fn(),
}));

jest.mock('../../src/services/healthManualService', () => ({
  createManualRecord: jest.fn(),
}));

jest.mock('../../src/services/familyAccessService', () => ({
  resolveTargetUserId: jest.fn(),
}));

const healthArchiveService = require('../../src/services/healthArchiveService');
const healthSyncService = require('../../src/services/healthSyncService');
const healthManualService = require('../../src/services/healthManualService');
const familyAccessService = require('../../src/services/familyAccessService');
const healthController = require('../../src/controllers/healthController');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

describe('healthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns today snapshot for targetUserId already resolved by middleware', async () => {
    healthArchiveService.getToday.mockResolvedValue({ alerts: [] });
    const res = createRes();

    await healthController.today(
      {
        user: { userId: 7 },
        targetUserId: 99,
        query: {},
      },
      res
    );

    expect(familyAccessService.resolveTargetUserId).not.toHaveBeenCalled();
    expect(healthArchiveService.getToday).toHaveBeenCalledWith(99);
    expect(res.body).toEqual({ code: 0, message: 'ok', data: { alerts: [] } });
  });

  it('validates missing trend metric_type', async () => {
    const res = createRes();

    await healthController.trend(
      {
        user: { userId: 7 },
        query: { period: '7d' },
      },
      res
    );

    expect(healthArchiveService.getTrend).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('validates missing trend period', async () => {
    const res = createRes();

    await healthController.trend(
      {
        user: { userId: 7 },
        query: { metric_type: 'heart_rate' },
      },
      res
    );

    expect(healthArchiveService.getTrend).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('sync maps coded service errors', async () => {
    const error = new Error('Sync payload invalid.');
    error.code = 422;
    error.statusCode = 422;
    healthSyncService.sync.mockRejectedValue(error);
    const res = createRes();

    await healthController.sync(
      {
        user: { userId: 7 },
        body: { deviceId: 'watch-01' },
      },
      res
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({ code: 422, message: 'Sync payload invalid.', data: null });
  });

  it('creates manual records', async () => {
    healthManualService.createManualRecord.mockResolvedValue({ id: 5, metricType: 'blood_pressure' });
    const res = createRes();

    await healthController.manual(
      {
        user: { userId: 7 },
        body: { metricType: 'blood_pressure', value: '120/80' },
      },
      res
    );

    expect(healthManualService.createManualRecord).toHaveBeenCalledWith(7, {
      metricType: 'blood_pressure',
      value: '120/80',
    });
    expect(res.body.code).toBe(0);
  });

  it('resolves family target for latest blood pressure', async () => {
    familyAccessService.resolveTargetUserId.mockReturnValue(23);
    healthArchiveService.getLatestBloodPressure.mockResolvedValue({ systolic: 120, diastolic: 80 });
    const res = createRes();

    await healthController.latestBloodPressure(
      {
        user: { userId: 7 },
        query: { user_id: '23' },
      },
      res
    );

    expect(familyAccessService.resolveTargetUserId).toHaveBeenCalledWith(7, '23');
    expect(healthArchiveService.getLatestBloodPressure).toHaveBeenCalledWith(23);
    expect(res.body.code).toBe(0);
  });

  it('uses generic 500 for latest heart rate uncoded errors', async () => {
    healthArchiveService.getLatestHeartRate.mockRejectedValue(new Error('Heart rate query failed.'));
    const res = createRes();

    await healthController.latestHeartRate(
      {
        user: { userId: 7 },
        query: {},
      },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ code: 500, message: 'Heart rate query failed.', data: null });
  });
});
