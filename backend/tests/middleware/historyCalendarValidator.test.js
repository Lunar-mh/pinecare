'use strict';

const { validateHistoryCalendarMonth } = require('../../src/middleware/validators/historyCalendarValidator');

function run(req = {}) {
  const res = {
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
  const next = jest.fn();
  validateHistoryCalendarMonth(req, res, next);
  return { res, next };
}

describe('historyCalendarValidator', () => {
  it('requires month and normalizes valid values', () => {
    let result = run({ query: {} });
    expect(result.res.body.message).toBe('month is required.');

    const req = { query: { month: ' 2026-03 ' } };
    result = run(req);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(req.query.month).toBe('2026-03');
  });

  it('rejects invalid month formats', () => {
    const result = run({ query: { month: '2026/03' } });
    expect(result.res.body.message).toBe('month must use YYYY-MM format.');
  });
});
