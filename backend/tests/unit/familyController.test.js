'use strict';

jest.mock('../../src/services/familyService', () => ({
  getFamilyBindings: jest.fn(),
  getElderlyOverview: jest.fn(),
  getElderHealth: jest.fn(),
  getNotificationSettings: jest.fn(),
  updateNotificationSettings: jest.fn(),
}));

const familyService = require('../../src/services/familyService');
const familyController = require('../../src/controllers/familyController');

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

describe('familyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns elderly overview in the unified envelope', async () => {
    familyService.getElderlyOverview.mockResolvedValue({ elderProfile: { elderId: 9 } });
    const res = createRes();

    await familyController.getElderlyOverview(
      { user: { userId: 3 }, query: { elderId: '9' } },
      res,
      jest.fn()
    );

    expect(familyService.getElderlyOverview).toHaveBeenCalledWith(3, { elderId: '9' });
    expect(res.body).toEqual({
      code: 0,
      message: 'success',
      data: { elderProfile: { elderId: 9 } },
    });
  });

  it('passes uncoded errors to next middleware', async () => {
    const next = jest.fn();
    const error = new Error('boom');
    familyService.getBindings = undefined;
    familyService.getFamilyBindings.mockRejectedValue(error);
    const res = createRes();

    await familyController.getBindings({ user: { userId: 3 } }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.body).toBeNull();
  });

  it('maps coded business errors for settings update', async () => {
    const error = new Error('Invalid settings payload.');
    error.code = 422;
    error.statusCode = 422;
    familyService.updateNotificationSettings.mockRejectedValue(error);
    const res = createRes();

    await familyController.updateSettings(
      { user: { userId: 3 }, body: { healthAlertEnabled: 'maybe' } },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      code: 422,
      message: 'Invalid settings payload.',
      data: null,
    });
  });
});

