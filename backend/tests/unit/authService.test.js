'use strict';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-refresh-jti'),
}));

jest.mock('../../src/config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  closeRedis: jest.fn(),
}));

jest.mock('../../src/models/user', () => ({
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

jest.mock('../../src/models/auditLog', () => ({
  create: jest.fn(),
}));

jest.mock('../../src/services/smsService', () => ({
  sendSms: jest.fn(),
  verifyAndConsumeCode: jest.fn(),
}));

jest.mock('../../src/services/wechatService', () => ({
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

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'super-secret-token-123';
    process.env.JWT_REFRESH_SECRET = 'super-refresh-token-456';
    process.env.ADMIN_USERNAME = 'admin-root';
    process.env.ADMIN_PASSWORD = 'super-admin-1234';

    jwt.sign.mockReset();
    jwt.verify.mockReset();
    bcrypt.hash.mockReset();
    bcrypt.compare.mockReset();
    redis.set.mockReset();
    redis.get.mockReset();
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token')
      .mockReturnValueOnce('access-token-2')
      .mockReturnValueOnce('refresh-token-2');
    redis.set.mockResolvedValue('OK');
  });

  it('sendSms delegates to sms service and records audit log', async () => {
    smsService.sendSms.mockResolvedValue({ sent: true, code_ttl_seconds: 300 });
    AuditLogModel.create.mockResolvedValue({ id: 1 });

    const result = await authService.sendSms('13800138000', 'login', {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req-1',
    });

    expect(result.sent).toBe(true);
    expect(smsService.sendSms).toHaveBeenCalledWith('13800138000', 'login');
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'send_sms',
        details: { phone: '13800138000', purpose: 'login', requestId: 'req-1' },
      })
    );
  });

  it('registerPhone rejects existing phone', async () => {
    UserModel.findByPhone.mockResolvedValue({ id: 1, phone: '13800138000' });

    await expect(
      authService.registerPhone({
        phone: '13800138000',
        code: '123456',
        password: 'Abcd1234',
      })
    ).rejects.toMatchObject({
      code: 409,
      statusCode: 409,
    });
  });

  it('loginPhone rejects unknown user and writes audit log', async () => {
    UserModel.findByPhone.mockResolvedValue(null);
    AuditLogModel.create.mockResolvedValue({ id: 1 });

    await expect(
      authService.loginPhone({
        phone: '13800138000',
        password: 'Abcd1234',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        requestId: 'req-2',
      })
    ).rejects.toMatchObject({
      code: 401,
      statusCode: 401,
    });

    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'login_fail',
        details: { phone: '13800138000', reason: 'not_found', requestId: 'req-2' },
      })
    );
  });

  it('loginPhone locks account after threshold on wrong password', async () => {
    UserModel.findByPhone.mockResolvedValue({
      id: 1,
      phone: '13800138000',
      account_status: 'active',
      failed_login_attempts: 4,
      password_hash: 'hashed-password',
    });
    bcrypt.compare.mockResolvedValue(false);
    UserModel.setAccountLock.mockResolvedValue({
      id: 1,
      account_status: 'locked',
    });
    AuditLogModel.create.mockResolvedValue({ id: 1 });

    await expect(
      authService.loginPhone({
        phone: '13800138000',
        password: 'Wrong1234',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      })
    ).rejects.toMatchObject({
      code: 423,
      statusCode: 423,
    });

    expect(UserModel.setAccountLock).toHaveBeenCalledWith(1, expect.any(Date), 5);
  });

  it('loginPhone succeeds and issues tokens', async () => {
    UserModel.findByPhone.mockResolvedValue({
      id: 1,
      phone: '13800138000',
      account_status: 'active',
      failed_login_attempts: 0,
      password_hash: 'hashed-password',
    });
    UserModel.findById.mockResolvedValue({
      id: 1,
      phone: '13800138000',
      openid: null,
      nickname: 'Alice',
      avatar_url: null,
      real_name: null,
      age: null,
      gender: null,
      chronic_diseases: [],
      account_status: 'active',
      created_at: '2026-03-11 10:00:00',
      updated_at: '2026-03-11 10:00:00',
      last_login_at: '2026-03-11 10:00:00',
    });
    bcrypt.compare.mockResolvedValue(true);
    UserModel.markLoginSuccess.mockResolvedValue(true);
    AuditLogModel.create.mockResolvedValue({ id: 1 });

    const result = await authService.loginPhone({
      phone: '13800138000',
      password: 'Abcd1234',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result.access_token).toBe('access-token');
    expect(result.refresh_token).toBe('refresh-token');
    expect(redis.set).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalled();
  });

  it('refreshToken rejects mismatch with redis cache', async () => {
    jwt.verify.mockReturnValue({
      userId: 1,
      token_type: 'refresh',
      jti: 'uuid-refresh-jti',
    });
    redis.get.mockResolvedValue('another-token');

    await expect(authService.refreshToken('refresh-token')).rejects.toMatchObject({
      code: 401,
      statusCode: 401,
    });
  });

  it('loginAdmin rejects invalid credentials', async () => {
    AuditLogModel.create.mockResolvedValue({ id: 1 });

    await expect(
      authService.loginAdmin({
        username: 'admin-root',
        password: 'wrong',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      })
    ).rejects.toMatchObject({
      code: 401,
      statusCode: 401,
    });
  });

  it('loginAdmin rejects when admin credentials are missing', async () => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;

    await expect(
      authService.loginAdmin({
        username: 'admin-root',
        password: 'super-admin-1234',
      })
    ).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('loginWithWechat creates a new user and issues tokens', async () => {
    wechatService.code2Session.mockResolvedValue({ openid: 'openid-1' });
    UserModel.findByOpenid.mockResolvedValue(null);
    UserModel.createWithWechat.mockResolvedValue({
      id: 2,
      phone: null,
      openid: 'openid-1',
      nickname: 'wx-user',
      avatar_url: null,
      real_name: null,
      age: null,
      gender: null,
      chronic_diseases: [],
      account_status: 'active',
      created_at: '2026-03-11 10:00:00',
      updated_at: '2026-03-11 10:00:00',
      last_login_at: null,
    });
    AuditLogModel.create.mockResolvedValue({ id: 1 });

    const result = await authService.loginWithWechat({
      code: 'wechat-code',
      userInfo: { nickName: 'wx-user', avatarUrl: 'https://avatar.example.com/1.png' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(wechatService.code2Session).toHaveBeenCalledWith('wechat-code');
    expect(UserModel.createWithWechat).toHaveBeenCalledWith({
      openid: 'openid-1',
      nickname: 'wx-user',
      avatarUrl: 'https://avatar.example.com/1.png',
    });
    expect(result.access_token).toBe('access-token');
  });

  it('unlockAccountByCode rejects missing user after sms verification', async () => {
    smsService.verifyAndConsumeCode.mockResolvedValue({ valid: true });
    UserModel.findByPhone.mockResolvedValue(null);

    await expect(
      authService.unlockAccountByCode('13800138000', '123456', {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      })
    ).rejects.toMatchObject({
      code: 404,
      statusCode: 404,
    });
  });
});
