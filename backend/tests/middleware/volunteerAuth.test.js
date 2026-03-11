'use strict';

jest.mock('../../src/models/adminScopeModel', () => ({
  findVolunteerScopeByUserId: jest.fn(),
}));

const adminScopeModel = require('../../src/models/adminScopeModel');
const volunteerAuth = require('../../src/middleware/volunteerAuth');

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('volunteerAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without a user', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    await volunteerAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects non-numeric volunteer user ids', async () => {
    const req = { user: { userId: 'bad' } };
    const res = createRes();
    const next = jest.fn();

    await volunteerAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('injects volunteer scope from the model layer', async () => {
    adminScopeModel.findVolunteerScopeByUserId.mockResolvedValueOnce({
      communityAdminId: 5,
      userId: 1001,
      communityId: 9,
      role: 'volunteer',
      name: 'Alice',
      phone: '13800000000',
    });

    const req = { user: { userId: 1001 } };
    const res = createRes();
    const next = jest.fn();

    await volunteerAuth(req, res, next);

    expect(adminScopeModel.findVolunteerScopeByUserId).toHaveBeenCalledWith(1001);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.volunteerScope.communityId).toBe(9);
    expect(req.volunteerScope.role).toBe('volunteer');
  });

  it('returns 403 when no volunteer scope exists', async () => {
    adminScopeModel.findVolunteerScopeByUserId.mockResolvedValueOnce(null);

    const req = { user: { userId: 1001 } };
    const res = createRes();
    const next = jest.fn();

    await volunteerAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
