'use strict';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const auth = require('../../src/middleware/auth');

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

describe('auth middleware', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'unit-test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('rejects requests without bearer token', () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication token is missing.');
  });

  it('fails closed when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('JWT_SECRET is required for token verification.');
  });

  it('rejects invalid tokens', () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication token is invalid or expired.');
  });

  it('hydrates req.user when token is valid', () => {
    jwt.verify.mockReturnValue({ userId: 9, role: 'user', isAdmin: false });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ userId: 9, role: 'user', isAdmin: false });
  });
});
