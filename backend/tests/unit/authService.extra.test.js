'use strict';

describe('authService extra', () => {
  function loadService() {
    jest.resetModules();

    jest.doMock('bcryptjs', () => ({
      hash: jest.fn(),
      compare: jest.fn(),
    }));
    jest.doMock('jsonwebtoken', () => ({
      sign: jest.fn(),
      verify: jest.fn(),
    }));
    jest.doMock('uuid', () => ({
      v4: jest.fn(() => 'uuid-refresh-jti'),
    }));
    jest.doMock('../../src/config/redis', () => ({
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    }));
    jest.doMock('../../src/models/user', () => ({
      findByPhone: jest.fn(),
      findById: jest.fn(),
      findByOpenid: jest.fn(),
      createWithPhone: jest.fn(),
      createWithWechat: jest.fn(),
      updateWechatProfile: jest.fn(),
      markLoginSuccess: jest.fn(),
      clearFailedAttempts: jest.fn(),
      incrementFailedLoginAttempts: jest.fn(),
      setAccountLock: jest.fn(),
      unlockByPhone: jest.fn(),
    }));
    jest.doMock('../../src/models/auditLog', () => ({
      create: jest.fn(),
    }));
    jest.doMock('../../src/services/smsService', () => ({
      sendSms: jest.fn(),
      verifyAndConsumeCode: jest.fn(),
    }));
    jest.doMock('../../src/services/wechatService', () => ({
      code2Session: jest.fn(),
    }));

    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const redis = require('../../src/config/redis');
    const UserModel = require('../../src/models/user');
    const AuditLogModel = require('../../src/models/auditLog');
    const smsService = require('../../src/services/smsService');
    const wechatService = require('../../src/services/wechatService');
    const authService = require('../../src/services/authService');

    process.env.JWT_SECRET = 'super-secret-token-123';
    process.env.JWT_REFRESH_SECRET = 'super-refresh-token-456';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'admin123';

    return { bcrypt, jwt, redis, UserModel, AuditLogModel, smsService, wechatService, authService };
  }

  it('registers phones and rejects invalid sms verification', async () => {
    const { bcrypt, jwt, redis, UserModel, AuditLogModel, smsService, authService } = loadService();
    UserModel.findByPhone.mockResolvedValueOnce(null);
    smsService.verifyAndConsumeCode.mockResolvedValueOnce({ valid: false, message: 'bad code' });
    await expect(authService.registerPhone({ phone: '13812345678', code: '123456', password: 'Abcd1234' })).rejects.toMatchObject({ code: 400 });

    UserModel.findByPhone.mockResolvedValueOnce(null);
    smsService.verifyAndConsumeCode.mockResolvedValueOnce({ valid: true });
    bcrypt.hash.mockResolvedValueOnce('hashed');
    UserModel.createWithPhone.mockResolvedValueOnce({ id: 7, phone: '13812345678', chronic_diseases: [], account_status: 'active' });
    jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');
    AuditLogModel.create.mockResolvedValueOnce({ id: 1 });

    await expect(authService.registerPhone({ phone: '13812345678', code: '123456', password: 'Abcd1234' })).resolves.toMatchObject({ access_token: 'access', refresh_token: 'refresh' });
    expect(redis.set).toHaveBeenCalled();
  });

  it('covers deleted, locked, no-password, and sms login branches', async () => {
    let loaded = loadService();
    loaded.UserModel.findByPhone.mockResolvedValueOnce({ id: 1, account_status: 'deleted' });
    await expect(loaded.authService.loginPhone({ phone: '13812345678', password: 'x' })).rejects.toMatchObject({ code: 403 });

    loaded = loadService();
    loaded.UserModel.findByPhone.mockResolvedValueOnce({ id: 1, account_status: 'locked', locked_until: '2999-01-01T00:00:00.000Z' });
    await expect(loaded.authService.loginPhone({ phone: '13812345678', password: 'x' })).rejects.toMatchObject({ code: 423 });

    loaded = loadService();
    loaded.UserModel.findByPhone.mockResolvedValueOnce({ id: 1, account_status: 'active', failed_login_attempts: 1, password_hash: null });
    await expect(loaded.authService.loginPhone({ phone: '13812345678', password: 'x' })).rejects.toMatchObject({ code: 401 });

    loaded = loadService();
    loaded.smsService.verifyAndConsumeCode.mockResolvedValueOnce({ valid: false, message: 'bad code' });
    await expect(loaded.authService.loginPhoneByCode({ phone: '13812345678', code: '123456' })).rejects.toMatchObject({ code: 400 });

    loaded = loadService();
    loaded.smsService.verifyAndConsumeCode.mockResolvedValueOnce({ valid: true });
    loaded.UserModel.findByPhone.mockResolvedValueOnce(null);
    loaded.UserModel.createWithPhone.mockResolvedValueOnce({ id: 9, phone: '13812345678', chronic_diseases: [], account_status: 'active' });
    loaded.UserModel.markLoginSuccess.mockResolvedValueOnce(true);
    loaded.UserModel.findById.mockResolvedValueOnce({ id: 9, phone: '13812345678', chronic_diseases: [], account_status: 'active' });
    loaded.jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');
    loaded.AuditLogModel.create.mockResolvedValue({ id: 1 });
    await expect(loaded.authService.loginPhoneByCode({ phone: '13812345678', code: '123456' })).resolves.toMatchObject({ access_token: 'access' });
  });

  it('covers refresh token validation and success payloads', async () => {
    let loaded = loadService();
    loaded.jwt.verify.mockImplementationOnce(() => {
      throw new Error('bad');
    });
    await expect(loaded.authService.refreshToken('bad')).rejects.toMatchObject({ code: 401 });

    loaded = loadService();
    loaded.jwt.verify.mockReturnValueOnce({ userId: 'x', token_type: 'access' });
    await expect(loaded.authService.refreshToken('bad')).rejects.toMatchObject({ code: 401 });

    loaded = loadService();
    loaded.jwt.verify.mockReturnValueOnce({ userId: 0, token_type: 'refresh', role: 'admin', isAdmin: true });
    loaded.redis.get.mockResolvedValueOnce('refresh');
    loaded.jwt.sign.mockReturnValueOnce('access2').mockReturnValueOnce('refresh2');
    loaded.AuditLogModel.create.mockResolvedValueOnce({ id: 1 });
    await expect(loaded.authService.refreshToken('refresh')).resolves.toEqual({ access_token: 'access2', refresh_token: 'refresh2', expires_in: 900 });
  });

  it('revokes refresh tokens for locked or deleted users', async () => {
    let loaded = loadService();
    loaded.jwt.verify.mockReturnValueOnce({ userId: 7, token_type: 'refresh' });
    loaded.redis.get.mockResolvedValueOnce('refresh');
    loaded.UserModel.findById.mockResolvedValueOnce({ id: 7, account_status: 'deleted' });
    await expect(loaded.authService.refreshToken('refresh')).rejects.toMatchObject({ code: 403 });
    expect(loaded.redis.del).toHaveBeenCalledWith('auth:refresh:7');

    loaded = loadService();
    loaded.jwt.verify.mockReturnValueOnce({ userId: 8, token_type: 'refresh' });
    loaded.redis.get.mockResolvedValueOnce('refresh');
    loaded.UserModel.findById.mockResolvedValueOnce({ id: 8, account_status: 'locked', locked_until: '2999-01-01T00:00:00.000Z' });
    await expect(loaded.authService.refreshToken('refresh')).rejects.toMatchObject({ code: 423 });
    expect(loaded.redis.del).toHaveBeenCalledWith('auth:refresh:8');
  });

  it('covers admin login, wechat update flow, and unlock account branches', async () => {
    let loaded = loadService();
    loaded.jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');
    loaded.AuditLogModel.create.mockResolvedValueOnce({ id: 1 });
    await expect(loaded.authService.loginAdmin({ username: 'admin', password: 'admin123' })).resolves.toMatchObject({ access_token: 'access', role: 'admin' });

    loaded = loadService();
    loaded.wechatService.code2Session.mockResolvedValueOnce({ openid: 'openid-1' });
    loaded.UserModel.findByOpenid.mockResolvedValueOnce({ id: 3, openid: 'openid-1', account_status: 'active', chronic_diseases: [] });
    loaded.UserModel.updateWechatProfile.mockResolvedValueOnce({ id: 3, openid: 'openid-1', account_status: 'active', chronic_diseases: [] });
    loaded.jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');
    loaded.AuditLogModel.create.mockResolvedValueOnce({ id: 1 });
    await expect(loaded.authService.loginWithWechat({ code: 'wx', userInfo: { nickName: 'n', avatarUrl: 'a' } })).resolves.toMatchObject({ access_token: 'access' });

    loaded = loadService();
    loaded.smsService.verifyAndConsumeCode.mockResolvedValueOnce({ valid: false, message: 'bad' });
    await expect(loaded.authService.unlockAccountByCode('13812345678', '123456')).rejects.toMatchObject({ code: 400 });

    loaded = loadService();
    loaded.smsService.verifyAndConsumeCode.mockResolvedValueOnce({ valid: true });
    loaded.UserModel.findByPhone.mockResolvedValueOnce({ id: 1, account_status: 'deleted' });
    await expect(loaded.authService.unlockAccountByCode('13812345678', '123456')).rejects.toMatchObject({ code: 403 });

    loaded = loadService();
    loaded.smsService.verifyAndConsumeCode.mockResolvedValueOnce({ valid: true });
    loaded.UserModel.findByPhone.mockResolvedValueOnce({ id: 1, account_status: 'locked' });
    loaded.UserModel.unlockByPhone.mockResolvedValueOnce({ id: 1, account_status: 'active', locked_until: null });
    loaded.AuditLogModel.create.mockResolvedValueOnce({ id: 1 });
    await expect(loaded.authService.unlockAccountByCode('13812345678', '123456')).resolves.toEqual({ account_status: 'active', locked_until: null });
  });
});

