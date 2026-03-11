'use strict';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

const { query } = require('../../src/config/database');
const adminScopeModel = require('../../src/models/adminScopeModel');

describe('adminScopeModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when community admin scope is missing', async () => {
    query.mockResolvedValueOnce([[]]);

    await expect(adminScopeModel.findCommunityAdminScopeByUserId(1001)).resolves.toBeNull();
  });

  it('maps community admin scope rows', async () => {
    query.mockResolvedValueOnce([[
      { id: 7, user_id: 1001, community_id: 9, role: 'leader' },
    ]]);

    await expect(adminScopeModel.findCommunityAdminScopeByUserId(1001)).resolves.toEqual({
      adminId: 7,
      userId: 1001,
      communityId: 9,
      role: 'leader',
      isGlobalAdmin: false,
    });
  });

  it('maps volunteer scope rows', async () => {
    query.mockResolvedValueOnce([[
      { id: 8, user_id: 1002, community_id: 6, role: 'volunteer', name: 'Bob', phone: '1390000' },
    ]]);

    await expect(adminScopeModel.findVolunteerScopeByUserId(1002)).resolves.toEqual({
      communityAdminId: 8,
      userId: 1002,
      communityId: 6,
      role: 'volunteer',
      name: 'Bob',
      phone: '1390000',
    });
  });
});
