'use strict';

jest.mock('../../src/services/onlineConsultationService', () => ({
  start: jest.fn(),
  listByUser: jest.fn(),
  updateStatus: jest.fn(),
}));

const onlineConsultationService = require('../../src/services/onlineConsultationService');
const controller = require('../../src/controllers/onlineConsultationController');

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

describe('onlineConsultationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts consultation with current user scope', async () => {
    onlineConsultationService.start.mockResolvedValue({ id: 8, consultStatus: 'pending' });
    const res = createRes();

    await controller.start(
      {
        user: { userId: 15 },
        body: { doctorId: 'doctor-1', department: 'Cardiology' },
      },
      res
    );

    expect(onlineConsultationService.start).toHaveBeenCalledWith(15, {
      doctorId: 'doctor-1',
      department: 'Cardiology',
    });
    expect(res.body).toEqual({ code: 0, message: 'Online consultation created.', data: { id: 8, consultStatus: 'pending' } });
  });

  it('returns coded errors for consultation list', async () => {
    const error = new Error('Consultation list unavailable.');
    error.code = 503;
    error.statusCode = 503;
    onlineConsultationService.listByUser.mockRejectedValue(error);
    const res = createRes();

    await controller.list(
      {
        user: { userId: 15 },
        query: { limit: '5' },
      },
      res
    );

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ code: 503, message: 'Consultation list unavailable.', data: null });
  });

  it('updates consultation status and falls back to 500 for uncoded errors', async () => {
    onlineConsultationService.updateStatus.mockRejectedValue(new Error('Status update failed.'));
    const res = createRes();

    await controller.updateStatus(
      {
        user: { userId: 15 },
        params: { consultationId: '12' },
        body: { consultStatus: 'closed' },
      },
      res
    );

    expect(onlineConsultationService.updateStatus).toHaveBeenCalledWith(15, '12', 'closed');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ code: 500, message: 'Status update failed.', data: null });
  });
});
