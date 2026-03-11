'use strict';

jest.mock('../../src/config/redis', () => ({
  incr: jest.fn(),
  expire: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../../src/models/smsCode', () => ({
  create: jest.fn(),
  findLatestByPhoneAndPurpose: jest.fn(),
  markUsed: jest.fn(),
  verifyAndConsume: jest.fn(),
}));

const redis = require('../../src/config/redis');
const SmsCodeModel = require('../../src/models/smsCode');
const smsService = require('../../src/services/smsService');

describe('smsService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects unsupported sms purpose', async () => {
    await expect(smsService.sendSms('13800138000', 'bad-purpose')).rejects.toMatchObject({
      code: 400,
      statusCode: 400,
    });
  });

  it('enforces daily sms limit', async () => {
    redis.incr.mockResolvedValue(11);

    await expect(smsService.sendSms('13800138000', 'login')).rejects.toMatchObject({
      code: 429,
      statusCode: 429,
    });
  });

  it('stores sms code in redis and persistence model', async () => {
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.set.mockResolvedValue('OK');
    SmsCodeModel.create.mockResolvedValue(1);

    const result = await smsService.sendSms('13800138000', 'login');

    expect(result).toEqual({
      sent: true,
      code_ttl_seconds: 300,
    });
    expect(redis.expire).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
    expect(SmsCodeModel.create).toHaveBeenCalled();
  });

  it('accepts development fallback code 000000 outside production', async () => {
    const result = await smsService.verifyAndConsumeCode('13800138000', '000000', 'login');

    expect(result).toEqual({ valid: true });
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('rejects unsupported verify purpose', async () => {
    const result = await smsService.verifyAndConsumeCode('13800138000', '123456', 'bad-purpose');

    expect(result.valid).toBe(false);
  });

  it('returns invalid when cached code mismatches', async () => {
    redis.get.mockResolvedValue('999999');

    const result = await smsService.verifyAndConsumeCode('13800138000', '123456', 'login');

    expect(result).toEqual({
      valid: false,
      message: '验证码错误',
    });
  });

  it('consumes matching redis code and marks latest record used', async () => {
    redis.get.mockResolvedValue('123456');
    redis.del.mockResolvedValue(1);
    SmsCodeModel.findLatestByPhoneAndPurpose.mockResolvedValue({
      id: 99,
      code: '123456',
      used: false,
    });
    SmsCodeModel.markUsed.mockResolvedValue(true);

    const result = await smsService.verifyAndConsumeCode('13800138000', '123456', 'login');

    expect(redis.del).toHaveBeenCalled();
    expect(SmsCodeModel.markUsed).toHaveBeenCalledWith(99);
    expect(result).toEqual({ valid: true });
  });

  it('falls back to persistence verification when redis cache is empty', async () => {
    redis.get.mockResolvedValue(null);
    SmsCodeModel.verifyAndConsume.mockResolvedValue({ valid: true, record: { id: 1 } });

    const result = await smsService.verifyAndConsumeCode('13800138000', '123456', 'login');

    expect(SmsCodeModel.verifyAndConsume).toHaveBeenCalledWith('13800138000', '123456', 'login');
    expect(result).toEqual({ valid: true, record: { id: 1 } });
  });
});
