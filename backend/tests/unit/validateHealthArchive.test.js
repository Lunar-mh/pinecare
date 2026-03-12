'use strict';

const {
  validateManualPayload,
  validateSyncPayload,
  validateTrendQuery,
} = require('../../src/middleware/validateHealthArchive');

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

describe('validateHealthArchive middleware', () => {
  it('rejects missing trend query fields', () => {
    const req = { query: { period: '7d' } };
    const res = createRes();
    const next = jest.fn();

    validateTrendQuery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('metric_type is required.');
  });

  it('accepts valid sync payloads', () => {
    const req = { body: { deviceId: '12', records: [{ metric_type: 'heart_rate', value: '80' }] } };
    const res = createRes();
    const next = jest.fn();

    validateSyncPayload(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.body).toBeNull();
  });

  it('rejects invalid manual payloads', () => {
    const req = { body: { metricType: 'heart_rate' } };
    const res = createRes();
    const next = jest.fn();

    validateManualPayload(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('value is required.');
  });
});
