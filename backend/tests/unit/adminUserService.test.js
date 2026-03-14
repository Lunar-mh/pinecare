'use strict';

jest.mock('../../src/config/redis', () => ({
  del: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../src/models/adminUserModel', () => ({
  listUsers: jest.fn(),
  countUsers: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  updateStatus: jest.fn(),
}));

const redis = require('../../src/config/redis');
const adminUserModel = require('../../src/models/adminUserModel');
const adminUserService = require('../../src/services/adminUserService');

const GLOBAL_SCOPE = {
  adminId: 0,
  userId: 0,
  communityId: 1,
  role: 'admin',
  isGlobalAdmin: true,
};

const SCOPED_SCOPE = {
  adminId: 11,
  userId: 1001,
  communityId: 3,
  role: 'leader',
  isGlobalAdmin: false,
};

describe('adminUserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails closed for non-global admin scopes', async () => {
    await expect(adminUserService.listUsers(SCOPED_SCOPE, {})).rejects.toMatchObject({
      code: 403,
      message: 'Admin users endpoint requires global admin scope.',
    });

    expect(adminUserModel.listUsers).not.toHaveBeenCalled();
  });

  it('lists users for global admins', async () => {
    adminUserModel.listUsers.mockResolvedValueOnce([
      {
        id: 1,
        nickname: 'A',
        phone: '13800000000',
        user_role: 'elder',
        account_status: 'active',
        age: 70,
        created_at: '2026-03-10 08:00:00',
        last_login_at: '2026-03-10 09:00:00',
      },
    ]);
    adminUserModel.countUsers.mockResolvedValueOnce(1);

    const result = await adminUserService.listUsers(GLOBAL_SCOPE, { page: '1', pageSize: '10' });

    expect(result.total).toBe(1);
    expect(result.list[0]).toEqual(
      expect.objectContaining({ id: 1, nickname: 'A', role: 'elder', status: '正常' })
    );
  });

  it('persists family role when creating a user', async () => {
    adminUserModel.createUser.mockResolvedValueOnce(101);
    adminUserModel.findById.mockResolvedValueOnce({
      id: 101,
      nickname: 'NewFamily',
      phone: '13900000000',
      user_role: 'family',
      account_status: 'active',
      age: null,
      created_at: '2026-03-10 08:00:00',
      last_login_at: null,
    });

    const result = await adminUserService.createUser(GLOBAL_SCOPE, {
      nickname: 'NewFamily',
      phone: '13900000000',
      role: 'family',
    });

    expect(adminUserModel.createUser).toHaveBeenCalledWith({
      nickname: 'NewFamily',
      phone: '13900000000',
      role: 'family',
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 101,
        role: 'family',
        status: '正常',
      })
    );
  });

  it('revokes refresh tokens after status updates', async () => {
    adminUserModel.updateStatus.mockResolvedValueOnce(1);

    await expect(
      adminUserService.updateUserStatus(GLOBAL_SCOPE, 7, 'disabled')
    ).resolves.toBeNull();

    expect(adminUserModel.updateStatus).toHaveBeenCalledWith(7, 'locked');
    expect(redis.del).toHaveBeenCalledWith('auth:refresh:7');
  });
});