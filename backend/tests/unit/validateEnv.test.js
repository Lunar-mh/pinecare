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
  process.env.WECHAT_NOTIFY_MODE = 'auto';
  process.env.OSS_MODE = 'stub';
  process.env.SERVER_ROLE = 'api';
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD_HASH;
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

  it('derives JWT refresh secret outside production live mode', () => {
    const { validateEnv } = require('../../src/config/validateEnv');

    const normalized = validateEnv();

    expect(normalized.JWT_SECRET).toBe('super-secret-token-123');
    expect(process.env.JWT_REFRESH_SECRET).toBeTruthy();
    expect(process.env.JWT_REFRESH_SECRET).not.toBe('super-secret-token-123');
    expect(process.env.RUNTIME_MODE).toBe('COMPETITION_SANDBOX');
    expect(process.env.SERVER_ROLE).toBe('api');
  });

  it('rejects placeholder secrets in production live mode', () => {
    process.env.RUNTIME_MODE = 'PRODUCTION_LIVE';
    process.env.COMPETITION_SANDBOX = '0';
    process.env.PRODUCTION_LIVE = '1';
    process.env.JWT_SECRET = 'replace_with_32_char_secret';
    process.env.JWT_REFRESH_SECRET = 'replace_with_32_char_refresh_secret';
    process.env.CORS_ALLOWED_ORIGINS = 'https://admin.example.com';
    process.env.ADMIN_USERNAME = 'admin-root';
    process.env.ADMIN_PASSWORD_HASH = '$2b$10$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcd';

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/placeholder value/i);
  });

  it('rejects mock wechat notify in production live mode', () => {
    process.env.RUNTIME_MODE = 'PRODUCTION_LIVE';
    process.env.COMPETITION_SANDBOX = '0';
    process.env.PRODUCTION_LIVE = '1';
    process.env.JWT_REFRESH_SECRET = 'another-super-secret-123';
    process.env.WECHAT_NOTIFY_MOCK = '1';
    process.env.CORS_ALLOWED_ORIGINS = 'https://admin.example.com';
    process.env.ADMIN_USERNAME = 'admin-root';
    process.env.ADMIN_PASSWORD_HASH = '$2b$10$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcd';

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/WECHAT_NOTIFY_MOCK/i);
  });

  it('requires OSS live upload configuration when OSS_MODE is live', () => {
    process.env.OSS_MODE = 'live';
    delete process.env.OSS_UPLOAD_API_URL;
    delete process.env.OSS_UPLOAD_TOKEN;
    delete process.env.OSS_ENDPOINT;
    delete process.env.OSS_ACCESS_KEY_ID;
    delete process.env.OSS_ACCESS_KEY_SECRET;

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/OSS live mode requires/i);
  });

  it('requires wechat notify config for live mode', () => {
    process.env.WECHAT_NOTIFY_MODE = 'live';
    delete process.env.WX_ACCESS_TOKEN;
    delete process.env.WX_MSG_TEMPLATE_ID;

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/WeChat notify live mode/i);
  });

  it('requires cors and bcrypt admin credentials in production live mode', () => {
    process.env.RUNTIME_MODE = 'PRODUCTION_LIVE';
    process.env.COMPETITION_SANDBOX = '0';
    process.env.PRODUCTION_LIVE = '1';
    process.env.JWT_REFRESH_SECRET = 'another-super-secret-123';
    process.env.WECHAT_NOTIFY_MOCK = '0';

    const { validateEnv } = require('../../src/config/validateEnv');

    expect(() => validateEnv()).toThrow(/CORS_ALLOWED_ORIGINS/i);

    process.env.CORS_ALLOWED_ORIGINS = 'https://admin.example.com';
    expect(() => validateEnv()).toThrow(/ADMIN_USERNAME and ADMIN_PASSWORD_HASH/i);

    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD_HASH = 'not-a-hash';
    expect(() => validateEnv()).toThrow(/valid bcrypt hash/i);
  });
});
