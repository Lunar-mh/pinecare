'use strict';

jest.mock('../../src/services/sosService', () => ({
  triggerSos: jest.fn(),
  cancelSos: jest.fn(),
  getHistory: jest.fn(),
  confirmSos: jest.fn(),
  resolveSos: jest.fn(),
}));

const sosService = require('../../src/services/sosService');
const sosController = require('../../src/controllers/sosController');

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

describe('sosController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('triggers sos with current user scope', async () => {
    sosService.triggerSos.mockResolvedValue({ eventId: 88, status: 'triggered' });
    const res = createRes();

    await sosController.trigger({ user: { userId: 5 }, body: { reason: 'fall' } }, res);

    expect(sosService.triggerSos).toHaveBeenCalledWith(5, { reason: 'fall' });
    expect(res.body).toEqual({
      code: 0,
      message: 'ok',
      data: { eventId: 88, status: 'triggered' },
    });
  });

  it('maps uncoded errors to 500 for cancel', async () => {
    sosService.cancelSos.mockRejectedValue(new Error('unexpected'));
    const res = createRes();

    await sosController.cancel({ user: { userId: 5 }, body: { event_id: 88 } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'unexpected',
      data: null,
    });
  });
});
