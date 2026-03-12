'use strict';

const { validateTrigger, validateEventId, validateHistoryQuery } = require('../../src/middleware/sosValidator');

function run(middleware, req = {}) {
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
  middleware(req, res, next);
  return { res, next };
}

describe('sosValidator middleware', () => {
  it('requires latitude and longitude together and normalizes valid coordinates', () => {
    let result = run(validateTrigger, { body: { latitude: 30.1 } });
    expect(result.next).not.toHaveBeenCalled();
    expect(result.res.body.message).toBe('latitude and longitude must be provided together.');

    const req = { body: { latitude: '30.1', longitude: '120.2' } };
    result = run(validateTrigger, req);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(req.body.latitude).toBe(30.1);
    expect(req.body.longitude).toBe(120.2);
  });

  it('validates event ids and history filters', () => {
    let result = run(validateEventId, { body: { event_id: '0' } });
    expect(result.res.body.message).toBe('event_id must be a positive integer.');

    const historyReq = { query: { page: '2', page_size: '20', status: 'confirmed' } };
    result = run(validateHistoryQuery, historyReq);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(historyReq.query.page).toBe(2);
    expect(historyReq.query.page_size).toBe(20);
    expect(historyReq.query.status).toBe('confirmed');

    result = run(validateHistoryQuery, { query: { status: 'bad' } });
    expect(result.res.body.message).toBe('status must be one of triggered/confirmed/resolved/cancelled.');
  });
});
