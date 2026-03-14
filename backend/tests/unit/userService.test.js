'use strict';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'qr-code-uuid'),
}));

jest.mock('../../src/config/redis', () => ({
  del: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../src/models/user', () => ({
  findById: jest.fn(),
  getProfileById: jest.fn(),
  updateProfile: jest.fn(),
  softDelete: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../src/models/emergencyContact', () => ({
  listByUserId: jest.fn(),
  countByUserId: jest.fn(),
  create: jest.fn(),
  findByIdAndUserId: jest.fn(),
  updateByIdAndUserId: jest.fn(),
  setPrimaryByIdAndUserId: jest.fn(),
  deleteByIdAndUserId: jest.fn(),
}));

jest.mock('../../src/models/familyBinding', () => ({
  createQrcodeBinding: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock('../../src/models/auditLog', () => ({
  create: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../src/services/smsService', () => ({
  verifyAndConsumeCode: jest.fn(),
}));

jest.mock('../../src/services/authService', () => ({
  unlockAccountByCode: jest.fn(),
}));

jest.mock('../../src/services/userPageConfigService', () => ({
  buildUserPageConfig: jest.fn(),
}));

const redis = require('../../src/config/redis');
const UserModel = require('../../src/models/user');
const EmergencyContactModel = require('../../src/models/emergencyContact');
const FamilyBindingModel = require('../../src/models/familyBinding');
const AuditLogModel = require('../../src/models/auditLog');
const smsService = require('../../src/services/smsService');
const authService = require('../../src/services/authService');
const { buildUserPageConfig } = require('../../src/services/userPageConfigService');
const userService = require('../../src/services/userService');

describe('userService', () => {
  const context = {
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws 404 when profile does not exist', async () => {
    UserModel.getProfileById.mockResolvedValue(null);

    await expect(userService.getProfile(1)).rejects.toMatchObject({
      code: 404,
      message: 'User not found.',
    });
  });

  it('returns page config assembled by page-config service', async () => {
    const profile = { id: 1, phone: '13812345678', account_status: 'active' };
    const contacts = [{ id: 1 }, { id: 2 }];

    UserModel.getProfileById.mockResolvedValue(profile);
    EmergencyContactModel.listByUserId.mockResolvedValue(contacts);
    buildUserPageConfig.mockReturnValue({ settingsItems: [], profileMeta: { completion: 80, appVersion: '1.0.0' } });

    const result = await userService.getPageConfig(1);

    expect(EmergencyContactModel.listByUserId).toHaveBeenCalledWith(1);
    expect(buildUserPageConfig).toHaveBeenCalledWith({
      profile,
      emergencyContactCount: 2,
    });
    expect(result.profileMeta.completion).toBe(80);
  });

  it('validates profile payload before update', async () => {
    UserModel.findById.mockResolvedValue({ id: 1, account_status: 'active' });

    await expect(userService.updateProfile(1, { age: 200 }, context)).rejects.toMatchObject({
      code: 400,
      message: 'age must be between 0 and 125.',
    });

    await expect(
      userService.updateProfile(1, { chronic_diseases: new Array(21).fill('htn') }, context)
    ).rejects.toMatchObject({
      code: 400,
      message: 'chronic_diseases can include up to 20 items.',
    });

    expect(UserModel.updateProfile).not.toHaveBeenCalled();
  });

  it('creates emergency contact and writes audit log', async () => {
    UserModel.findById.mockResolvedValue({ id: 1, account_status: 'active' });
    EmergencyContactModel.countByUserId.mockResolvedValue(2);
    EmergencyContactModel.create.mockResolvedValue({ id: 99, is_primary: true });

    const result = await userService.createEmergencyContact(
      1,
      {
        name: 'Mom',
        phone: '13812345678',
        relationship: 'mother',
        is_primary: true,
      },
      context
    );

    expect(EmergencyContactModel.create).toHaveBeenCalledWith(1, {
      name: 'Mom',
      phone: '13812345678',
      relationship: 'mother',
      isPrimary: true,
    });
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'contact_manage',
      })
    );
    expect(result.id).toBe(99);
  });

  it('rejects non-boolean emergency contact primary flags', async () => {
    UserModel.findById.mockResolvedValue({ id: 1, account_status: 'active' });

    await expect(
      userService.createEmergencyContact(
        1,
        {
          name: 'Dad',
          phone: '13812345678',
          relationship: 'father',
          is_primary: '1',
        },
        context
      )
    ).rejects.toMatchObject({
      code: 400,
      message: 'is_primary must be boolean.',
    });

    await expect(
      userService.updateEmergencyContact(
        1,
        8,
        {
          name: 'Dad',
          is_primary: '1',
        },
        context
      )
    ).rejects.toMatchObject({
      code: 400,
      message: 'is_primary must be boolean.',
    });
  });

  it('blocks contact creation when max limit is reached', async () => {
    UserModel.findById.mockResolvedValue({ id: 1, account_status: 'active' });
    EmergencyContactModel.countByUserId.mockResolvedValue(5);

    await expect(
      userService.createEmergencyContact(
        1,
        {
          name: 'Dad',
          phone: '13812345678',
          relationship: 'father',
        },
        context
      )
    ).rejects.toMatchObject({
      code: 400,
    });
  });

  it('updates contact and promotes primary contact when requested', async () => {
    UserModel.findById.mockResolvedValue({ id: 1, account_status: 'active' });
    EmergencyContactModel.findByIdAndUserId
      .mockResolvedValueOnce({ id: 8, user_id: 1 })
      .mockResolvedValueOnce({
        id: 8,
        user_id: 1,
        name: 'Updated',
        is_primary: 1,
      });
    EmergencyContactModel.updateByIdAndUserId.mockResolvedValue({ id: 8 });
    EmergencyContactModel.setPrimaryByIdAndUserId.mockResolvedValue({ id: 8, is_primary: 1 });

    const result = await userService.updateEmergencyContact(
      1,
      8,
      {
        name: 'Updated',
        is_primary: true,
      },
      context
    );

    expect(EmergencyContactModel.updateByIdAndUserId).toHaveBeenCalledWith(8, 1, {
      name: 'Updated',
      phone: undefined,
      relationship: undefined,
    });
    expect(EmergencyContactModel.setPrimaryByIdAndUserId).toHaveBeenCalledWith(8, 1);
    expect(result.name).toBe('Updated');
  });

  it('creates binding qrcode and records audit log', async () => {
    UserModel.findById.mockResolvedValue({ id: 1, account_status: 'active' });
    FamilyBindingModel.createQrcodeBinding.mockResolvedValue({ id: 77 });

    const result = await userService.bindingQrcode(1, context);

    expect(FamilyBindingModel.createQrcodeBinding).toHaveBeenCalledWith(
      1,
      'qrcodeuuid',
      expect.any(Date)
    );
    expect(result.binding_id).toBe(77);
    expect(result.qr_code).toBe('qrcodeuuid');
  });

  it('rejects binding approval from non-owner elder', async () => {
    UserModel.findById.mockResolvedValue({ id: 1, account_status: 'active' });
    FamilyBindingModel.findById.mockResolvedValue({
      id: 3,
      elder_user_id: 5,
      binding_status: 'pending',
    });

    await expect(
      userService.approveBinding(1, { binding_id: 3, action: 'approve' }, context)
    ).rejects.toMatchObject({
      code: 403,
      message: 'No permission for this binding.',
    });
  });

  it('soft deletes account after sms verification', async () => {
    UserModel.findById.mockResolvedValue({
      id: 1,
      phone: '13812345678',
      account_status: 'active',
    });
    smsService.verifyAndConsumeCode.mockResolvedValue({ valid: true });

    const result = await userService.deleteAccountByCode(1, '123456', context);

    expect(smsService.verifyAndConsumeCode).toHaveBeenCalledWith(
      '13812345678',
      '123456',
      'account_delete'
    );
    expect(UserModel.softDelete).toHaveBeenCalledWith(1);
    expect(redis.del).toHaveBeenCalledWith('auth:refresh:1');
    expect(result).toBeNull();
  });

  it('delegates unlockAccount to auth service', async () => {
    authService.unlockAccountByCode.mockResolvedValue({ unlocked: true });

    const result = await userService.unlockAccount('13812345678', '123456', context);

    expect(authService.unlockAccountByCode).toHaveBeenCalledWith('13812345678', '123456', context);
    expect(result).toEqual({ unlocked: true });
  });
});