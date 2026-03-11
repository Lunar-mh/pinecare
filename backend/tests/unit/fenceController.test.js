'use strict';

jest.mock('../../src/services/fenceService', () => ({
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  toggle: jest.fn(),
}));

const fenceService = require('../../src/services/fenceService');
const fenceController = require('../../src/controllers/fenceController');

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
      return this;
    },
  };
}

describe('fenceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('list returns unified success envelope', async () => {
    fenceService.list.mockResolvedValue([{ id: 1 }]);
    const res = createRes();

    await fenceController.list({ user: { userId: 7 } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ code: 0, message: 'ok', data: [{ id: 1 }] });
  });

  it('create maps coded service errors', async () => {
    const err = new Error('bad payload');
    err.code = 400;
    err.statusCode = 400;
    fenceService.create.mockRejectedValue(err);

    const res = createRes();
    await fenceController.create({ user: { userId: 7 }, body: {} }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ code: 400, message: 'bad payload', data: null });
  });

  it('update validates fence id before hitting service', async () => {
    const res = createRes();
    await fenceController.update({ user: { userId: 7 }, params: { fenceId: 'x' }, body: {} }, res);

    expect(fenceService.update).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('remove returns success envelope after delete', async () => {
    fenceService.remove.mockResolvedValue(null);
    const res = createRes();

    await fenceController.remove({ user: { userId: 7 }, params: { fenceId: '9' } }, res);

    expect(fenceService.remove).toHaveBeenCalledWith(7, 9);
    expect(res.body).toEqual({ code: 0, message: 'ok', data: null });
  });

  it('toggle passes raw active flag and handles uncoded errors as 500', async () => {
    const res1 = createRes();
    fenceService.toggle.mockResolvedValue({ id: 9, isActive: false });
    await fenceController.toggle(
      { user: { userId: 7 }, params: { fenceId: '9' }, body: { isActive: 0 } },
      res1
    );
    expect(fenceService.toggle).toHaveBeenCalledWith(7, 9, 0);
    expect(res1.statusCode).toBe(200);

    const res2 = createRes();
    fenceService.toggle.mockRejectedValue(new Error('boom'));
    await fenceController.toggle(
      { user: { userId: 7 }, params: { fenceId: '9' }, body: { isActive: true } },
      res2
    );
    expect(res2.statusCode).toBe(500);
    expect(res2.body).toEqual({ code: 500, message: 'Internal server error.', data: null });
  });
});
