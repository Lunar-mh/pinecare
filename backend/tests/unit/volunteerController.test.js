'use strict';

jest.mock('../../src/services/volunteerService', () => ({
  getProfile: jest.fn(),
  getTasks: jest.fn(),
  acceptTask: jest.fn(),
  checkInTask: jest.fn(),
  checkOutTask: jest.fn(),
  completeTask: jest.fn(),
  getTraining: jest.fn(),
}));

const volunteerService = require('../../src/services/volunteerService');
const volunteerController = require('../../src/controllers/volunteerController');

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

describe('volunteerController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns volunteer profile in success envelope', async () => {
    volunteerService.getProfile.mockResolvedValue({ volunteerId: 11, name: 'Lin' });
    const res = createRes();

    await volunteerController.getProfile({ volunteerScope: { volunteerId: 11 } }, res, jest.fn());

    expect(volunteerService.getProfile).toHaveBeenCalledWith({ volunteerId: 11 });
    expect(res.body).toEqual({
      code: 0,
      message: 'success',
      data: { volunteerId: 11, name: 'Lin' },
    });
  });

  it('delegates uncoded errors to next middleware', async () => {
    const next = jest.fn();
    const error = new Error('boom');
    volunteerService.getTasks.mockRejectedValue(error);
    const res = createRes();

    await volunteerController.getTasks({ volunteerScope: { volunteerId: 11 }, query: {} }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.body).toBeNull();
  });

  it('maps coded errors through controllerError helper', async () => {
    const error = new Error('Task already accepted.');
    error.code = 409;
    error.statusCode = 409;
    volunteerService.acceptTask.mockRejectedValue(error);
    const res = createRes();

    await volunteerController.acceptTask(
      { volunteerScope: { volunteerId: 11 }, params: { taskId: '77' } },
      res,
      jest.fn()
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      code: 409,
      message: 'Task already accepted.',
      data: null,
    });
  });
});
