'use strict';

jest.mock('../../src/services/userService', () => ({
  getProfile: jest.fn(),
  getPageConfig: jest.fn(),
  updateProfile: jest.fn(),
  listEmergencyContacts: jest.fn(),
  createEmergencyContact: jest.fn(),
  updateEmergencyContact: jest.fn(),
  setPrimaryContact: jest.fn(),
  deleteEmergencyContact: jest.fn(),
  bindingQrcode: jest.fn(),
  approveBinding: jest.fn(),
  deleteAccount: jest.fn(),
  unlockAccount: jest.fn(),
}));

const userService = require('../../src/services/userService');
const userController = require('../../src/controllers/userController');

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

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns profile in unified envelope', async () => {
    userService.getProfile.mockResolvedValue({ id: 1, nickname: 'Elder' });
    const req = { user: { userId: 1 } };
    const res = createRes();

    await userController.getProfile(req, res);

    expect(userService.getProfile).toHaveBeenCalledWith(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.nickname).toBe('Elder');
  });

  it('returns page config in unified envelope', async () => {
    userService.getPageConfig.mockResolvedValue({ settingsItems: [{ key: 'about' }] });
    const req = { user: { userId: 1 } };
    const res = createRes();

    await userController.getPageConfig(req, res);

    expect(userService.getPageConfig).toHaveBeenCalledWith(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.settingsItems).toHaveLength(1);
  });

  it('blocks emergency contact creation when phone is invalid', async () => {
    const req = {
      user: { userId: 1 },
      body: { name: 'Mom', phone: '12345', relationship: 'mother' },
    };
    const res = createRes();

    await userController.createEmergencyContact(req, res);

    expect(userService.createEmergencyContact).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('validates emergency contact id on update', async () => {
    const req = {
      user: { userId: 1 },
      params: { id: 'abc' },
      body: { name: 'Dad' },
    };
    const res = createRes();

    await userController.updateEmergencyContact(req, res);

    expect(userService.updateEmergencyContact).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid contact id.');
  });

  it('validates binding action before calling service', async () => {
    const req = {
      user: { userId: 1 },
      body: { binding_id: '3', action: 'hold' },
    };
    const res = createRes();

    await userController.approveBinding(req, res);

    expect(userService.approveBinding).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('action must be approve or reject.');
  });

  it('validates sms code before deleting account', async () => {
    const req = {
      user: { userId: 1 },
      body: { code: '12' },
    };
    const res = createRes();

    await userController.deleteAccount(req, res);

    expect(userService.deleteAccount).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('passes phone/code and request context into unlockAccount', async () => {
    userService.unlockAccount.mockResolvedValue({ unlocked: true });
    const req = {
      body: { phone: '13812345678', code: '123456' },
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'user-agent': 'jest',
      },
      ip: '127.0.0.1',
    };
    const res = createRes();

    await userController.unlockAccount(req, res);

    expect(userService.unlockAccount).toHaveBeenCalledWith('13812345678', '123456', {
      ipAddress: '1.1.1.1',
      userAgent: 'jest',
      requestId: null,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.code).toBe(0);
  });

  it('maps coded service errors for profile retrieval', async () => {
    const err = new Error('User not found.');
    err.code = 404;
    err.statusCode = 404;
    userService.getProfile.mockRejectedValue(err);

    const req = { user: { userId: 9 } };
    const res = createRes();

    await userController.getProfile(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      code: 404,
      message: 'User not found.',
      data: null,
    });
  });
});
