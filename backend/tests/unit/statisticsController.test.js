'use strict';

jest.mock('../../src/services/statisticsService', () => ({
  getOverview: jest.fn(),
  getActivities: jest.fn(),
}));

const statisticsService = require('../../src/services/statisticsService');
const statisticsController = require('../../src/controllers/statisticsController');

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

describe('statisticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns overview payload in unified envelope', async () => {
    statisticsService.getOverview.mockResolvedValue({
      stats: [{ label: 'Active', value: '1' }],
      recentActivities: [],
    });

    const req = { query: {} };
    const res = createRes();

    await statisticsController.overview(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
    expect(statisticsService.getOverview).toHaveBeenCalledTimes(1);
  });

  it('uses coded service errors when available', async () => {
    const err = new Error('Statistics source busy.');
    err.code = 503;
    err.statusCode = 503;
    statisticsService.getActivities.mockRejectedValue(err);

    const req = { query: { limit: '5' } };
    const res = createRes();

    await statisticsController.activities(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      code: 503,
      message: 'Statistics source busy.',
      data: null,
    });
  });

  it('falls back to service unavailable message for uncoded errors', async () => {
    statisticsService.getOverview.mockRejectedValue(new Error('boom'));

    const req = { query: {} };
    const res = createRes();

    await statisticsController.overview(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Statistics service is temporarily unavailable.',
      data: null,
    });
  });
});
