'use strict';

jest.mock('../../src/services/medicationPlanService', () => ({
  listPlans: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
}));

jest.mock('../../src/utils/medicationPlanPresenter', () => ({
  presentPlanList: jest.fn((value) => ({ list: value })),
  presentPlan: jest.fn((value) => ({ item: value })),
}));

jest.mock('../../src/services/medicationLogService', () => ({
  getTodaySchedule: jest.fn(),
  getLogs: jest.fn(),
}));

jest.mock('../../src/services/medicationConfirmService', () => ({
  confirm: jest.fn(),
}));

jest.mock('../../src/services/medicationSettingService', () => ({
  getSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

jest.mock('../../src/services/medicationHistoryService', () => ({
  getCalendar: jest.fn(),
}));

const medicationPlanService = require('../../src/services/medicationPlanService');
const medicationPlanPresenter = require('../../src/utils/medicationPlanPresenter');
const medicationLogService = require('../../src/services/medicationLogService');
const medicationConfirmService = require('../../src/services/medicationConfirmService');
const medicationSettingService = require('../../src/services/medicationSettingService');
const medicationHistoryService = require('../../src/services/medicationHistoryService');
const medicationPlanController = require('../../src/controllers/medicationPlanController');
const medicationLogController = require('../../src/controllers/medicationLogController');
const medicationSettingController = require('../../src/controllers/medicationSettingController');
const medicationHistoryController = require('../../src/controllers/medicationHistoryController');

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

describe('medication controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists medication plans through presenter', async () => {
    medicationPlanService.listPlans.mockResolvedValue([{ id: 1 }]);
    const res = createRes();

    await medicationPlanController.list({ user: { userId: 5 } }, res);

    expect(medicationPlanService.listPlans).toHaveBeenCalledWith(5);
    expect(medicationPlanPresenter.presentPlanList).toHaveBeenCalledWith([{ id: 1 }]);
    expect(res.body.code).toBe(0);
  });

  it('rejects invalid medication plan ids before update', async () => {
    const res = createRes();

    await medicationPlanController.update(
      {
        user: { userId: 5 },
        params: { id: '0' },
        body: {},
      },
      res
    );

    expect(medicationPlanService.updatePlan).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('maps coded delete errors for medication plans', async () => {
    const error = new Error('Plan not found.');
    error.code = 404;
    error.statusCode = 404;
    medicationPlanService.deletePlan.mockRejectedValue(error);
    const res = createRes();

    await medicationPlanController.remove(
      {
        user: { userId: 5 },
        params: { id: '12' },
      },
      res
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ code: 404, message: 'Plan not found.', data: null });
  });

  it('loads today medication schedule', async () => {
    medicationLogService.getTodaySchedule.mockResolvedValue({ slots: [] });
    const res = createRes();

    await medicationLogController.today(
      {
        user: { userId: 5 },
        query: { date: '2026-03-12' },
      },
      res
    );

    expect(medicationLogService.getTodaySchedule).toHaveBeenCalledWith(5, '2026-03-12');
    expect(res.body.code).toBe(0);
  });

  it('returns idempotent confirm responses with success envelope', async () => {
    medicationConfirmService.confirm.mockResolvedValue({ idempotent: true, logId: 88 });
    const res = createRes();

    await medicationLogController.confirm(
      {
        user: { userId: 5 },
        body: { medicationLogId: 88 },
      },
      res
    );

    expect(res.body.code).toBe(0);
    expect(res.body.data).toEqual({ idempotent: true, logId: 88 });
  });

  it('uses generic 500 for uncoded medication confirm errors', async () => {
    medicationConfirmService.confirm.mockRejectedValue(new Error('Confirm failed.'));
    const res = createRes();

    await medicationLogController.confirm(
      {
        user: { userId: 5 },
        body: { medicationLogId: 88 },
      },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe(500);
  });

  it('gets medication settings', async () => {
    medicationSettingService.getSettings.mockResolvedValue({ reminderEnabled: true });
    const res = createRes();

    await medicationSettingController.getSettings({ user: { userId: 5 } }, res);

    expect(medicationSettingService.getSettings).toHaveBeenCalledWith(5);
    expect(res.body.code).toBe(0);
  });

  it('maps coded errors when updating settings', async () => {
    const error = new Error('Settings payload invalid.');
    error.code = 422;
    error.statusCode = 422;
    medicationSettingService.updateSettings.mockRejectedValue(error);
    const res = createRes();

    await medicationSettingController.updateSettings(
      {
        user: { userId: 5 },
        body: { reminderEnabled: 'bad' },
      },
      res
    );

    expect(res.statusCode).toBe(422);
    expect(res.body.code).toBe(422);
  });

  it('loads medication history calendar with trimmed month', async () => {
    medicationHistoryService.getCalendar.mockResolvedValue({ days: [] });
    const res = createRes();

    await medicationHistoryController.calendar(
      {
        user: { userId: 5 },
        query: { month: '2026-03' },
      },
      res
    );

    expect(medicationHistoryService.getCalendar).toHaveBeenCalledWith(5, '2026-03');
    expect(res.body.code).toBe(0);
  });
});
