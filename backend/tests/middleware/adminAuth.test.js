'use strict';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../src/config/database');
const adminAuth = require('../../src/middleware/adminAuth');

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('adminAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows global admin and injects scope from query', async () => {
    const req = {
      user: { userId: 0, role: 'admin', isAdmin: true },
      query: { community_id: '9' },
      body: {},
    };
    const res = createRes();
    const next = jest.fn();

    await adminAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.adminScope.communityId).toBe(9);
    expect(req.adminScope.isGlobalAdmin).toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid community_id for global admin', async () => {
    const req = {
      user: { userId: 0, role: 'admin', isAdmin: true },
      query: { community_id: 'abc' },
      body: {},
    };
    const res = createRes();
    const next = jest.fn();

    await adminAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows scoped community admin from DB', async () => {
    query.mockResolvedValueOnce([[
      { id: 11, user_id: 1001, community_id: 3, role: 'admin' },
    ]]);

    const req = {
      user: { userId: 1001, role: 'user', isAdmin: false },
      query: {},
      body: {},
    };
    const res = createRes();
    const next = jest.fn();

    await adminAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.adminScope.communityId).toBe(3);
    expect(req.adminScope.isGlobalAdmin).toBe(false);
  });
});
