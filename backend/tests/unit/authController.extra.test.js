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

describe('authController extra', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates sms and registration inputs then returns success payloads', async () => {
    let res = createRes();
    await authController.sendSms({ body: {}, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(400);

    res = createRes();
    await authController.sendSms({ body: { phone: '12', purpose: 'login' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(400);

    authService.sendSms.mockResolvedValueOnce({ sent: true });
    res = createRes();
    await authController.sendSms({ body: { phone: '13812345678', purpose: 'login' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.message).toBe('SMS sent.');

    res = createRes();
    await authController.registerPhone({ body: { phone: '13812345678', code: '12', password: 'short' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(400);

    authService.registerPhone.mockResolvedValueOnce({ access_token: 'a', user: { id: 1 } });
    res = createRes();
    await authController.registerPhone({ body: { phone: '13812345678', code: '123456', password: 'Abcd1234' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ access_token: 'a', user: { id: 1 } });
  });

  it('covers phone, refresh, and admin login flows', async () => {
    let res = createRes();
    await authController.loginPhone({ body: { phone: '12', password: 'x' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(400);

    authService.loginPhone.mockResolvedValueOnce({ access_token: 'a', refresh_token: 'r' });
    res = createRes();
    await authController.loginPhone({ body: { phone: '13812345678', password: 'Abcd1234' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data.access_token).toBe('a');

    res = createRes();
    await authController.adminLogin({ body: {}, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(400);

    authService.loginAdmin.mockResolvedValueOnce({ access_token: 'a', refresh_token: 'r', expires_in: 10, username: 'admin', role: 'admin' });
    res = createRes();
    await authController.adminLogin({ body: { username: 'admin', password: 'admin123' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ token: 'a', refresh_token: 'r', expires_in: 10, username: 'admin', role: 'admin' });

    authService.refreshToken.mockResolvedValueOnce({ access_token: 'a2', refresh_token: 'r2', expires_in: 20 });
    res = createRes();
    await authController.refreshToken({ body: { refresh_token: 'r' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ access_token: 'a2', refresh_token: 'r2', expires_in: 20 });
  });

  it('covers wechat and phone-code mini program login payload reshaping', async () => {
    let res = createRes();
    await authController.loginWechat({ body: {}, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(400);

    authService.loginWithWechat.mockResolvedValueOnce({ access_token: 'a', user: { id: 1 } });
    res = createRes();
    await authController.loginWechat({ body: { code: 'wx' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ access_token: 'a', user: { id: 1 } });

    authService.loginWithWechat.mockResolvedValueOnce({ access_token: 'mini', user: { id: 2 } });
    res = createRes();
    await authController.loginWechatMiniProgram({ body: { code: 'wx' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ token: 'mini', userInfo: { id: 2 } });

    res = createRes();
    await authController.loginPhoneByCode({ body: { phone: '13812345678', code: '12' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(400);

    authService.loginPhoneByCode.mockResolvedValueOnce({ access_token: 'phone-code', user: { id: 3 } });
    res = createRes();
    await authController.loginPhoneByCode({ body: { phone: '13812345678', code: '123456' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.body.data).toEqual({ token: 'phone-code', userInfo: { id: 3 } });
  });

  it('uses generic 500 for uncoded auth service errors', async () => {
    authService.sendSms.mockRejectedValueOnce(new Error('boom'));
    const res = createRes();
    await authController.sendSms({ body: { phone: '13812345678', purpose: 'login' }, headers: {}, ip: '127.0.0.1' }, res);
    expect(res.statusCode).toBe(500);
  });
});
