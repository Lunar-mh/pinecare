'use strict';

jest.mock('../../src/services/userService', () => ({
  getProfile: jest.fn(),
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

describe('userController extra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates profile and lists contacts with request context', async () => {
    userService.updateProfile.mockResolvedValue({ id: 1, real_name: 'Alice' });
    userService.listEmergencyContacts.mockResolvedValue([{ id: 2 }]);
    const req = {
      user: { userId: 1 },
      body: { real_name: 'Alice', age: 70, gender: 'female', chronic_diseases: ['htn'] },
      headers: { 'x-forwarded-for': '1.1.1.1', 'user-agent': 'jest' },
      ip: '127.0.0.1',
    };
    const res = createRes();

    await userController.updateProfile(req, res);
    expect(userService.updateProfile).toHaveBeenCalledWith(1, req.body, {
      ipAddress: '1.1.1.1',
      userAgent: 'jest',
    });
    expect(res.body.code).toBe(0);

    await userController.listEmergencyContacts({ user: { userId: 1 } }, res);
    expect(res.body.data).toEqual([{ id: 2 }]);
  });

  it('handles create and update emergency contact validation branches', async () => {
    let res = createRes();
    await userController.createEmergencyContact({ user: { userId: 1 }, body: { name: 'Mom' } }, res);
    expect(res.statusCode).toBe(400);

    userService.createEmergencyContact.mockResolvedValue({ id: 3 });
    res = createRes();
    await userController.createEmergencyContact({ user: { userId: 1 }, body: { name: 'Mom', phone: '13812345678', relationship: 'mother', is_primary: true }, headers: {}, ip: '127.0.0.1' }, res);
    expect(userService.createEmergencyContact).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ is_primary: true }),
      expect.any(Object)
    );
    expect(res.body.data).toEqual({ id: 3 });

    res = createRes();
    await userController.updateEmergencyContact({ user: { userId: 1 }, params: { id: '2' }, body: null }, res);
    expect(res.statusCode).toBe(400);

    res = createRes();
    await userController.updateEmergencyContact({ user: { userId: 1 }, params: { id: '2' }, body: { phone: '12' } }, res);
    expect(res.statusCode).toBe(400);

    userService.updateEmergencyContact.mockResolvedValue({ id: 2, name: 'Dad' });
    res = createRes();
    await userController.updateEmergencyContact({ user: { userId: 1 }, params: { id: '2' }, body: { name: 'Dad' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ id: 2, name: 'Dad' });
  });

  it('covers primary contact, delete, binding qrcode, and binding approval paths', async () => {
    let res = createRes();
    await userController.setPrimaryContact({ user: { userId: 1 }, params: { id: 'bad' } }, res);
    expect(res.statusCode).toBe(400);

    userService.setPrimaryContact.mockResolvedValue({ id: 2, is_primary: true });
    res = createRes();
    await userController.setPrimaryContact({ user: { userId: 1 }, params: { id: '2' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ id: 2, is_primary: true });

    res = createRes();
    await userController.deleteEmergencyContact({ user: { userId: 1 }, params: { id: 'bad' } }, res);
    expect(res.statusCode).toBe(400);

    userService.deleteEmergencyContact.mockResolvedValue(null);
    res = createRes();
    await userController.deleteEmergencyContact({ user: { userId: 1 }, params: { id: '2' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.code).toBe(0);

    userService.bindingQrcode.mockResolvedValue({ qr_code: 'q1' });
    res = createRes();
    await userController.createBindingQrcode({ user: { userId: 1 }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ qr_code: 'q1' });

    res = createRes();
    await userController.approveBinding({ user: { userId: 1 }, body: { action: 'approve' } }, res);
    expect(res.statusCode).toBe(400);

    res = createRes();
    await userController.approveBinding({ user: { userId: 1 }, body: { binding_id: 'bad', action: 'approve' } }, res);
    expect(res.statusCode).toBe(400);

    userService.approveBinding.mockResolvedValue({ binding_id: 3, action: 'approve' });
    res = createRes();
    await userController.approveBinding({ user: { userId: 1 }, body: { binding_id: '3', action: 'approve' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ binding_id: 3, action: 'approve' });
  });

  it('covers delete account validation and generic error handling', async () => {
    let res = createRes();
    await userController.deleteAccount({ user: { userId: 1 }, body: {} }, res);
    expect(res.statusCode).toBe(400);

    userService.deleteAccount.mockResolvedValue(null);
    res = createRes();
    await userController.deleteAccount({ user: { userId: 1 }, body: { code: '123456' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.code).toBe(0);

    userService.bindingQrcode.mockRejectedValueOnce(new Error('boom'));
    res = createRes();
    await userController.createBindingQrcode({ user: { userId: 1 }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(500);
  });
});
