'use strict';

jest.mock('../../src/services/alertService', () => ({
  listAlerts: jest.fn(),
}));

const alertService = require('../../src/services/alertService');
const alertController = require('../../src/controllers/alertController');

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

describe('alertController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns alert list in unified envelope', async () => {
    alertService.listAlerts.mockResolvedValue({
      list: [{ id: 1, level: 'warning' }],
      total: 1,
    });

    const req = {
      user: { userId: 1001 },
      query: { isHandled: 'false' },
    };
    const res = createRes();

    await alertController.list(req, res);

    expect(alertService.listAlerts).toHaveBeenCalledWith(1001, { isHandled: 'false' });
    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.data).toEqual({
      list: [{ id: 1, level: 'warning' }],
      total: 1,
    });
  });

  it('maps coded service errors through fail envelope', async () => {
    const err = new Error('Alert not found.');
    err.code = 404;
    err.statusCode = 404;
    alertService.listAlerts.mockRejectedValue(err);

    const req = {
      user: { userId: 1001 },
      query: {},
    };
    const res = createRes();

    await alertController.list(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      code: 404,
      message: 'Alert not found.',
      data: null,
    });
  });

  it('falls back to generic 500 for uncoded service errors', async () => {
    alertService.listAlerts.mockRejectedValue(new Error('boom'));
    const res = createRes();

    await alertController.list(
      {
        user: { userId: 1001 },
        query: {},
      },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.data).toBeNull();
  });
});
