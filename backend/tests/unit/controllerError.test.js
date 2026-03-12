'use strict';

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const { sendControllerError } = require('../../src/utils/controllerError');

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

describe('controllerError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps coded business errors with data', () => {
    const err = new Error('Conflict.');
    err.code = 409;
    err.statusCode = 409;
    err.data = { field: 'status' };

    const res = createRes();
    sendControllerError(res, err, { moduleName: 'appointmentController', action: 'create_failed' });

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      code: 409,
      message: 'Conflict.',
      data: { field: 'status' },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'appointmentController',
      'create_failed',
      expect.objectContaining({ coded: true, code: 409, message: 'Conflict.' })
    );
  });

  it('uses provided default message for uncoded errors', () => {
    const res = createRes();
    sendControllerError(res, new Error('boom'), { defaultMessage: 'Service unavailable.' });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Service unavailable.',
      data: null,
    });
  });

  it('can prefer the original error message for uncoded errors', () => {
    const res = createRes();
    sendControllerError(res, new Error('Upload exploded.'), {
      defaultMessage: 'Location upload failed.',
      moduleName: 'locationController',
      preferErrorMessage: true,
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      code: 500,
      message: 'Upload exploded.',
      data: null,
    });
  });
});
