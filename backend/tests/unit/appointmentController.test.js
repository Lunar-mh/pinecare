'use strict';

jest.mock('../../src/services/appointmentService', () => ({
  create: jest.fn(),
  listByUser: jest.fn(),
  cancel: jest.fn(),
}));

const appointmentService = require('../../src/services/appointmentService');
const appointmentController = require('../../src/controllers/appointmentController');

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

describe('appointmentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create returns created payload and prefers x-idempotency-key', async () => {
    appointmentService.create.mockResolvedValue({
      duplicate: false,
      idempotencyKey: 'req-1',
      appointment: { id: 1, appointStatus: 'confirmed' },
    });

    const req = {
      user: { userId: 9 },
      body: {
        hospitalId: 1,
        department: 'Cardiology',
        doctorId: 2,
        appointmentDate: '2026-03-11',
        timeSlot: '09:00',
      },
      headers: {
        'x-idempotency-key': 'req-1',
        'x-request-id': 'fallback-id',
      },
      requestId: 'generated-id',
    };
    const res = createRes();

    await appointmentController.create(req, res);

    expect(appointmentService.create).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ idempotencyKey: 'req-1' })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('created');
  });

  it('list maps service result to unified response', async () => {
    appointmentService.listByUser.mockResolvedValue({
      list: [{ id: 1 }],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const req = {
      user: { userId: 9 },
      query: { status: 'confirmed', page: '1', pageSize: '10' },
    };
    const res = createRes();

    await appointmentController.list(req, res);

    expect(appointmentService.listByUser).toHaveBeenCalledWith(9, req.query);
    expect(res.body.code).toBe(0);
    expect(res.body.data.total).toBe(1);
  });

  it('cancel returns idempotent replay message when already cancelled', async () => {
    appointmentService.cancel.mockResolvedValue({
      idempotent: true,
      appointment: { id: 3, appointStatus: 'cancelled' },
    });

    const req = {
      user: { userId: 9 },
      params: { appointmentId: '3' },
    };
    const res = createRes();

    await appointmentController.cancel(req, res);

    expect(res.body.message).toBe('idempotent replay');
    expect(res.body.data.appointment.id).toBe(3);
  });

  it('returns coded service errors through fail envelope', async () => {
    const err = new Error('Appointment not found.');
    err.code = 404;
    err.statusCode = 404;
    appointmentService.cancel.mockRejectedValue(err);

    const req = {
      user: { userId: 9 },
      params: { appointmentId: '404' },
    };
    const res = createRes();

    await appointmentController.cancel(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      code: 404,
      message: 'Appointment not found.',
      data: null,
    });
  });
});
