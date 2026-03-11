'use strict';

jest.mock('../../src/services/authService', () => ({
  sendSms: jest.fn(),
  registerPhone: jest.fn(),
  loginPhone: jest.fn(),
  loginAdmin: jest.fn(),
  refreshToken: jest.fn(),
  loginWithWechat: jest.fn(),
  loginPhoneByCode: jest.fn(),
}));

const authService = require('../../src/services/authService');
const authController = require('../../src/controllers/authController');

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

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sendSms validates invalid purpose', async () => {
    const req = {
      body: {
        phone: '13800138000',
        purpose: 'invalid',
      },
      headers: {},
      ip: '127.0.0.1',
    };
    const res = createRes();

    await authController.sendSms(req, res);

    expect(authService.sendSms).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('registerPhone returns service payload', async () => {
    authService.registerPhone.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 900,
      user: { id: 1, phone: '13800138000' },
    });

    const req = {
      body: {
        phone: '13800138000',
        code: '123456',
        password: 'Abcd1234!',
      },
      headers: {
        'user-agent': 'jest',
      },
      ip: '127.0.0.1',
    };
    const res = createRes();

    await authController.registerPhone(req, res);

    expect(authService.registerPhone).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '13800138000',
        code: '123456',
        password: 'Abcd1234!',
      })
    );
    expect(res.body.code).toBe(0);
    expect(res.body.data.user.id).toBe(1);
  });

  it('adminLogin reshapes service payload for admin frontend', async () => {
    authService.loginAdmin.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 900,
      username: 'admin',
      role: 'admin',
    });

    const req = {
      body: {
        username: ' admin ',
        password: 'secret',
      },
      headers: {},
      ip: '127.0.0.1',
    };
    const res = createRes();

    await authController.adminLogin(req, res);

    expect(authService.loginAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'admin',
        password: 'secret',
      })
    );
    expect(res.body.data.token).toBe('access');
    expect(res.body.data.role).toBe('admin');
  });

  it('refreshToken validates missing token', async () => {
    const req = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
    };
    const res = createRes();

    await authController.refreshToken(req, res);

    expect(authService.refreshToken).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('loginPhoneByCode maps service payload to mini program format', async () => {
    authService.loginPhoneByCode.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 900,
      user: { id: 3, phone: '13800138000' },
    });

    const req = {
      body: {
        phone: '13800138000',
        code: '123456',
      },
      headers: {},
      ip: '127.0.0.1',
    };
    const res = createRes();

    await authController.loginPhoneByCode(req, res);

    expect(res.body.code).toBe(0);
    expect(res.body.data).toEqual({
      token: 'access',
      userInfo: { id: 3, phone: '13800138000' },
    });
  });

  it('maps coded service errors through fail envelope', async () => {
    const err = new Error('Invalid phone or password.');
    err.code = 401;
    err.statusCode = 401;
    authService.loginPhone.mockRejectedValue(err);

    const req = {
      body: {
        phone: '13800138000',
        password: 'Wrong123!',
      },
      headers: {},
      ip: '127.0.0.1',
    };
    const res = createRes();

    await authController.loginPhone(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid phone or password.');
  });
});
