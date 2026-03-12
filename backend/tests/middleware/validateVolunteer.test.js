'use strict';

const {
  validateTaskQuery,
  validateTaskAction,
  validateTrainingQuery,
} = require('../../src/middleware/validateVolunteer');

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

describe('validateVolunteer middleware', () => {
  it('normalizes valid task queries and rejects invalid status', () => {
    const req = { query: { page: '2', page_size: '15', status: 'processing' } };
    let result = run(validateTaskQuery, req);

    expect(result.next).toHaveBeenCalledTimes(1);
    expect(req.query.page).toBe(2);
    expect(req.query.page_size).toBe(15);
    expect(req.query.pageSize).toBe(15);
    expect(req.query.status).toBe('processing');

    result = run(validateTaskQuery, { query: { status: 'bad' } });
    expect(result.res.body.message).toBe('status must be one of pending/assigned/processing/completed/cancelled.');
  });

  it('validates task actions and training query filters', () => {
    let result = run(validateTaskAction, { params: { taskId: '0' } });
    expect(result.res.body.message).toBe('taskId must be a positive integer.');

    const req = { query: { page: '3', pageSize: '12', status: 'completed' } };
    result = run(validateTrainingQuery, req);
    expect(result.next).toHaveBeenCalledTimes(1);
    expect(req.query.page).toBe(3);
    expect(req.query.pageSize).toBe(12);
    expect(req.query.page_size).toBe(12);
    expect(req.query.status).toBe('completed');
  });
});
