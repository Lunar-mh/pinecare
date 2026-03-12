'use strict';

jest.mock('../../src/models/adminScopeModel', () => ({
  findCommunityAdminScopeByUserId: jest.fn(),
}));

const adminScopeModel = require('../../src/models/adminScopeModel');
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

  it('rejects missing auth context', async () => {
    const req = { query: {}, body: {} };
    const res = createRes();
    const next = jest.fn();

    await adminAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
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
    expect(adminScopeModel.findCommunityAdminScopeByUserId).not.toHaveBeenCalled();
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

  it('rejects invalid token payload for scoped admin flow', async () => {
    const req = {
      user: { userId: 'NaN', role: 'user', isAdmin: false },
      query: {},
      body: {},
    };
    const res = createRes();
    const next = jest.fn();

    await adminAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects users without an admin scope', async () => {
    adminScopeModel.findCommunityAdminScopeByUserId.mockResolvedValueOnce(null);
    const req = {
      user: { userId: 1001, role: 'user', isAdmin: false },
      query: {},
      body: {},
    };
    const res = createRes();
    const next = jest.fn();

    await adminAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows scoped community admin from the model layer', async () => {
    adminScopeModel.findCommunityAdminScopeByUserId.mockResolvedValueOnce({
      adminId: 11,
      userId: 1001,
      communityId: 3,
      role: 'admin',
      isGlobalAdmin: false,
    });

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
