'use strict';

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

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

    await volunteerController.getProfile({ volunteerScope: { volunteerId: 11 } }, res);

    expect(volunteerService.getProfile).toHaveBeenCalledWith({ volunteerId: 11 });
    expect(res.body).toEqual({
      code: 0,
      message: 'Volunteer profile loaded.',
      data: { volunteerId: 11, name: 'Lin' },
    });
  });

  it('uses operation-specific default message for uncoded task query errors', async () => {
    volunteerService.getTasks.mockRejectedValue(new Error('boom'));
    const res = createRes();

    await volunteerController.getTasks({ volunteerScope: { volunteerId: 11 }, query: {} }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Failed to load volunteer tasks.',
      data: null,
    });
  });

  it('maps coded errors through controllerError helper', async () => {
    const error = new Error('Task already accepted.');
    error.code = 409;
    error.statusCode = 409;
    volunteerService.acceptTask.mockRejectedValue(error);
    const res = createRes();

    await volunteerController.acceptTask(
      { volunteerScope: { volunteerId: 11 }, params: { taskId: '77' } },
      res
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      code: 409,
      message: 'Task already accepted.',
      data: null,
    });
  });

  it('returns task completion payloads', async () => {
    volunteerService.completeTask.mockResolvedValue({ task_id: 77, status: 'completed' });
    const res = createRes();

    await volunteerController.completeTask(
      { volunteerScope: { volunteerId: 11 }, params: { taskId: '77' } },
      res
    );

    expect(res.body).toEqual({
      code: 0,
      message: 'Volunteer task completed.',
      data: { task_id: 77, status: 'completed' },
    });
  });

  it('maps coded training errors through controllerError helper', async () => {
    const error = new Error('Invalid training status.');
    error.code = 400;
    error.statusCode = 400;
    volunteerService.getTraining.mockRejectedValue(error);
    const res = createRes();

    await volunteerController.getTraining(
      { volunteerScope: { volunteerId: 11 }, query: { status: 'invalid' } },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid training status.');
  });
});
