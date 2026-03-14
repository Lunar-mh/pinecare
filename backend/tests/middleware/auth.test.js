'use strict';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
}));

jest.mock('../../src/models/user', () => ({
  findById: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const redis = require('../../src/config/redis');
const UserModel = require('../../src/models/user');
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
    redis.get.mockResolvedValue('1');
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('rejects requests without bearer token', async () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication token is missing.');
  });

  it('fails closed when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('JWT_SECRET is required for token verification.');
  });

  it('rejects invalid tokens', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication token is invalid or expired.');
  });

  it('hydrates req.user when token is valid and user is active', async () => {
    jwt.verify.mockReturnValue({ userId: 9, role: 'user', isAdmin: false });
    UserModel.findById.mockResolvedValue({ id: 9, account_status: 'active' });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ userId: 9, role: 'user', isAdmin: false });
  });

  it('rejects deleted users even when the jwt is valid', async () => {
    jwt.verify.mockReturnValue({ userId: 9, role: 'user', isAdmin: false });
    UserModel.findById.mockResolvedValue({ id: 9, account_status: 'deleted' });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Account has been deleted.');
  });

  it('rejects users locked past the current time', async () => {
    jwt.verify.mockReturnValue({ userId: 9, role: 'user', isAdmin: false });
    UserModel.findById.mockResolvedValue({
      id: 9,
      account_status: 'locked',
      locked_until: '2999-01-01T00:00:00.000Z',
    });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(423);
    expect(res.body.message).toBe('Account is locked.');
  });

  it('checks redis session for admin tokens', async () => {
    jwt.verify.mockReturnValue({ userId: 0, role: 'admin', isAdmin: true, sid: 'sid-1' });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(redis.get).toHaveBeenCalledWith('auth:admin:session:sid-1');
    expect(UserModel.findById).not.toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 0, role: 'admin', isAdmin: true });
  });

  it('rejects admin tokens without sid session id', async () => {
    jwt.verify.mockReturnValue({ userId: 0, role: 'admin', isAdmin: true });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('fails closed when admin session is missing or redis is down', async () => {
    jwt.verify.mockReturnValue({ userId: 0, role: 'admin', isAdmin: true, sid: 'sid-1' });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    redis.get.mockResolvedValueOnce(null);
    await auth(req, res, next);
    expect(res.statusCode).toBe(401);

    redis.get.mockRejectedValueOnce(new Error('redis down'));
    await auth(req, res, next);
    expect(res.statusCode).toBe(503);
  });
});
