'use strict';

jest.mock('../../src/services/medicalReportService', () => ({
  list: jest.fn(),
}));

const medicalReportService = require('../../src/services/medicalReportService');
const medicalReportController = require('../../src/controllers/medicalReportController');

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

describe('medicalReportController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists reports with normalized query params', async () => {
    medicalReportService.list.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    const res = createRes();

    await medicalReportController.list(
      {
        user: { userId: 18 },
        query: {
          reportType: 'lab',
          startDate: '2026-03-01',
          endDate: '2026-03-11',
          page: '1',
          pageSize: '20',
        },
      },
      res
    );

    expect(medicalReportService.list).toHaveBeenCalledWith(18, {
      reportType: 'lab',
      startDate: '2026-03-01',
      endDate: '2026-03-11',
      page: '1',
      pageSize: '20',
    });
    expect(res.body).toEqual({
      code: 0,
      message: 'Medical reports loaded.',
      data: { list: [{ id: 1 }], total: 1 },
    });
  });

  it('returns coded service failures', async () => {
    const error = new Error('Medical report service unavailable.');
    error.code = 503;
    error.statusCode = 503;
    medicalReportService.list.mockRejectedValue(error);
    const res = createRes();

    await medicalReportController.list({ user: { userId: 18 }, query: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      code: 503,
      message: 'Medical report service unavailable.',
      data: null,
    });
  });
});
