'use strict';

jest.mock('../../src/services/adminOpsService', () => ({
  getHealthOverview: jest.fn(),
  getMedicationLogs: jest.fn(),
  updateMedicationLogStatus: jest.fn(),
  getGpsCurrent: jest.fn(),
  getGpsTrail: jest.fn(),
  getFamilyBindings: jest.fn(),
  getMedicalReports: jest.fn(),
  getSosEvents: jest.fn(),
  updateSosEventStatus: jest.fn(),
  getFallEvents: jest.fn(),
  getDrugInteractions: jest.fn(),
  updateDrugInteractionStatus: jest.fn(),
  getTimeBankServiceHistory: jest.fn(),
  confirmTimeBankService: jest.fn(),
  getTimeBankExchangeHistory: jest.fn(),
  getTimeBankLeaderboard: jest.fn(),
}));

const adminOpsService = require('../../src/services/adminOpsService');
const adminOpsController = require('../../src/controllers/adminOpsController');

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

describe('adminOpsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks non-admin users', async () => {
    const req = {
      user: { userId: 1, role: 'user' },
      query: {},
    };
    const res = createRes();

    await adminOpsController.healthOverview(req, res);

    expect(adminOpsService.getHealthOverview).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe(403);
  });

  it('returns health overview for admin users', async () => {
    adminOpsService.getHealthOverview.mockResolvedValue({
      list: [{ userId: 1 }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    const req = {
      user: { userId: 0, role: 'admin', isAdmin: true },
      query: { page: '1', pageSize: '10' },
    };
    const res = createRes();

    await adminOpsController.healthOverview(req, res);

    expect(adminOpsService.getHealthOverview).toHaveBeenCalledWith(req.query);
    expect(res.body.code).toBe(0);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('maps coded service errors for medication log update', async () => {
    const err = new Error('Medication log not found.');
    err.code = 404;
    err.statusCode = 404;
    adminOpsService.updateMedicationLogStatus.mockRejectedValue(err);

    const req = {
      user: { userId: 0, role: 'admin', isAdmin: true },
      params: { logId: '999' },
      body: { status: 'taken' },
    };
    const res = createRes();

    await adminOpsController.updateMedicationLogStatus(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Medication log not found.');
  });

  it('returns generic 500 for uncoded service errors', async () => {
    adminOpsService.getSosEvents.mockRejectedValue(new Error('unexpected'));

    const req = {
      user: { userId: 0, role: 'admin', isAdmin: true },
      query: {},
    };
    const res = createRes();

    await adminOpsController.sosEvents(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Internal server error.',
      data: null,
    });
  });
});
