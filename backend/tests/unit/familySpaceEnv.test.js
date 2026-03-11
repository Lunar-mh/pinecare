'use strict';

const REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'OSS_REGION',
  'OSS_BUCKET',
  'OSS_ACCESS_KEY_ID',
  'OSS_ACCESS_KEY_SECRET',
];

describe('familySpaceEnv', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function loadModule(env = {}) {
    jest.resetModules();
    process.env = { ...originalEnv, ...env };
    return require('../../src/config/familySpaceEnv');
  }

  it('reports missing required keys', () => {
    const familySpaceEnv = loadModule({
      DB_HOST: 'host',
      DB_PORT: '',
      DB_USER: '',
      DB_NAME: '',
      JWT_SECRET: '',
      OSS_REGION: '',
      OSS_BUCKET: '',
      OSS_ACCESS_KEY_ID: '',
      OSS_ACCESS_KEY_SECRET: '',
    });

    const result = familySpaceEnv.validateFamilySpaceEnv();
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([
      'DB_PORT',
      'DB_USER',
      'DB_NAME',
      'JWT_SECRET',
      'OSS_REGION',
      'OSS_BUCKET',
      'OSS_ACCESS_KEY_ID',
      'OSS_ACCESS_KEY_SECRET',
    ]);
  });

  it('passes when all required keys are present', () => {
    const env = Object.fromEntries(REQUIRED_KEYS.map((key) => [key, `${key.toLowerCase()}-value`]));
    const familySpaceEnv = loadModule(env);

    expect(familySpaceEnv.REQUIRED_KEYS).toEqual(REQUIRED_KEYS);
    expect(familySpaceEnv.validateFamilySpaceEnv()).toEqual({
      valid: true,
      missing: [],
    });
  });
});
