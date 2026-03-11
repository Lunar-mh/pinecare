'use strict';

const ORIGINAL_ENV = { ...process.env };

function applyBaseEnv() {
  process.env.PORT = '3000';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
  process.env.DB_USER = 'root';
  process.env.DB_PASSWORD = 'dev-password';
  process.env.DB_NAME = 'yinban';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.JWT_SECRET = 'super-secret-token-123';
  delete process.env.JWT_REFRESH_SECRET;
  process.env.RUNTIME_MODE = 'COMPETITION_SANDBOX';
  process.env.COMPETITION_SANDBOX = '1';
  process.env.PRODUCTION_LIVE = '0';
  process.env.WECHAT_NOTIFY_MOCK = '1';
  process.env.AI_CONSULT_MODE = 'auto';
  process.env.VOICE_SERVICE_MODE = 'auto';
  process.env.MEDICAL_API_MODE = 'auto';
  process.env.OSS_MODE = 'stub';
}

describe('validateEnv', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    applyBaseEnv();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('fills JWT refresh secret from JWT secret', () => {
    const { validateEnv } = require('../../src/config/validateEnv');

    const normalized = validateEnv();

    expect(normalized.JWT_SECRET).toBe('super-secret-token-123');
    expect(process.env.JWT_REFRESH_SECRET).toBe('super-secret-token-123');
    expect(process.env.RUNTIME_MODE).toBe('COMPETITION_SANDBOX');
  });

  it('rejects placeholder secrets in production live mode', () => {
    process.env.RUNTIME_MODE = 'PRODUCTION_LIVE';
    process.env.COMPETITION_SANDBOX = '0';
    process.env.PRODUCTION_LIVE = '1';
    process.env.JWT_SECRET = 'replace_with_32_char_secret';
    process.env.JWT_REFRESH_SECRET = 'replace_with_32_char_refresh_secret';

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/placeholder value/i);
  });

  it('rejects mock wechat notify in production live mode', () => {
    process.env.RUNTIME_MODE = 'PRODUCTION_LIVE';
    process.env.COMPETITION_SANDBOX = '0';
    process.env.PRODUCTION_LIVE = '1';
    process.env.JWT_REFRESH_SECRET = 'another-super-secret-123';
    process.env.WECHAT_NOTIFY_MOCK = '1';

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/WECHAT_NOTIFY_MOCK/i);
  });

  it('requires DashScope for AI live mode', () => {
    process.env.AI_CONSULT_MODE = 'live';
    delete process.env.DASHSCOPE_API_KEY;

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/AI consult live mode/i);
  });

  it('requires OSS live config for voice live mode', () => {
    process.env.VOICE_SERVICE_MODE = 'live';
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.OSS_MODE = 'live';
    delete process.env.OSS_UPLOAD_API_URL;
    delete process.env.OSS_UPLOAD_TOKEN;
    delete process.env.OSS_ENDPOINT;
    delete process.env.OSS_ACCESS_KEY_ID;
    delete process.env.OSS_ACCESS_KEY_SECRET;

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/OSS live upload configuration/i);
  });

  it('requires medical API config for live mode', () => {
    process.env.MEDICAL_API_MODE = 'live';
    delete process.env.MEDICAL_API_BASE_URL;
    delete process.env.MEDICAL_API_KEY;

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/Medical API live mode/i);
  });
});
