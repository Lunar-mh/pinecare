'use strict';

const {
  validateFenceId,
  validateTrailQuery,
  validateUpload,
} = require('../../src/middleware/validateGpsTracking');

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

describe('validateGpsTracking middleware', () => {
  it('normalizes valid upload payloads', () => {
    const req = { body: { latitude: '31.2', longitude: '121.5', accuracy: '8', locationType: 'gps' } };
    const res = createRes();
    const next = jest.fn();

    validateUpload(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toMatchObject({ latitude: 31.2, longitude: 121.5, accuracy: 8, locationType: 'gps' });
  });

  it('rejects invalid trail query', () => {
    const req = { query: { startDate: 'bad-date', endDate: '2026-03-12' } };
    const res = createRes();
    const next = jest.fn();

    validateTrailQuery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('startDate must be a valid date string.');
  });

  it('rejects invalid fence ids', () => {
    const req = { params: { fenceId: 'abc' } };
    const res = createRes();
    const next = jest.fn();

    validateFenceId(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('fenceId must be a positive integer.');
  });
});
