'use strict';

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

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
      message: 'SOS event created.',
      data: { eventId: 88, status: 'triggered' },
    });
  });

  it('maps coded errors for history requests', async () => {
    const error = new Error('History filter invalid.');
    error.code = 422;
    error.statusCode = 422;
    sosService.getHistory.mockRejectedValue(error);
    const res = createRes();

    await sosController.history({ user: { userId: 5 }, query: { page: 0 } }, res);

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      code: 422,
      message: 'History filter invalid.',
      data: null,
    });
  });

  it('confirms sos events successfully', async () => {
    sosService.confirmSos.mockResolvedValue({ eventId: 88, status: 'confirmed' });
    const res = createRes();

    await sosController.confirm({ user: { userId: 5 }, body: { event_id: 88 } }, res);

    expect(sosService.confirmSos).toHaveBeenCalledWith(5, 88);
    expect(res.body.data.status).toBe('confirmed');
  });

  it('uses operation-specific default message for uncoded cancel errors', async () => {
    sosService.cancelSos.mockRejectedValue(new Error('unexpected'));
    const res = createRes();

    await sosController.cancel({ user: { userId: 5 }, body: { event_id: 88 } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Failed to cancel SOS event.',
      data: null,
    });
  });

  it('uses operation-specific default message for uncoded resolve errors', async () => {
    sosService.resolveSos.mockRejectedValue(new Error('unexpected'));
    const res = createRes();

    await sosController.resolve({ user: { userId: 5 }, body: { event_id: 88 } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Failed to resolve SOS event.',
      data: null,
    });
  });
});
