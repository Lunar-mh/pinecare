'use strict';

jest.mock('../../src/services/deviceService', () => ({
  bind: jest.fn(),
  unbind: jest.fn(),
  list: jest.fn(),
  setPrimary: jest.fn(),
}));

const deviceService = require('../../src/services/deviceService');
const deviceController = require('../../src/controllers/deviceController');

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

describe('deviceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bind returns success envelope', async () => {
    deviceService.bind.mockResolvedValue({ deviceId: 1, status: 'bound' });

    const req = {
      user: { userId: 1001 },
      body: { deviceCode: 'DEV-001' },
    };
    const res = createRes();

    await deviceController.bind(req, res);

    expect(deviceService.bind).toHaveBeenCalledWith(1001, { deviceCode: 'DEV-001' });
    expect(res.body).toEqual({
      code: 0,
      message: 'ok',
      data: { deviceId: 1, status: 'bound' },
    });
  });

  it('unbind maps service errors', async () => {
    const err = new Error('Device not found.');
    err.code = 404;
    err.statusCode = 404;
    deviceService.unbind.mockRejectedValue(err);

    const req = {
      user: { userId: 1001 },
      body: { deviceId: 2 },
    };
    const res = createRes();

    await deviceController.unbind(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      code: 404,
      message: 'Device not found.',
      data: null,
    });
  });

  it('list returns unified envelope', async () => {
    deviceService.list.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const req = {
      user: { userId: 1001 },
    };
    const res = createRes();

    await deviceController.list(req, res);

    expect(deviceService.list).toHaveBeenCalledWith(1001);
    expect(res.body.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('setPrimary uses generic 500 when service error has no code', async () => {
    deviceService.setPrimary.mockRejectedValue(new Error('unexpected'));

    const req = {
      user: { userId: 1001 },
      body: { deviceId: 1 },
    };
    const res = createRes();

    await deviceController.setPrimary(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe(500);
  });
});
