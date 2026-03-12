'use strict';

describe('credentialService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  function loadService(env = {}) {
    jest.resetModules();
    process.env = { ...originalEnv, ...env };

    jest.doMock('../../src/utils/logger', () => ({
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    }));

    const service = require('../../src/services/credentialService');
    const logger = require('../../src/utils/logger');
    return { service, logger };
  }

  it('fails closed when HASH_SECRET is missing', () => {
    const { service, logger } = loadService({ HASH_SECRET: '' });

    expect(() => service.generateSignature({ foo: 'bar' })).toThrow(
      'HASH_SECRET is required for signature generation.'
    );
    expect(service.verifySignature({ foo: 'bar' }, 'invalid-signature')).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'credentialService',
      'missing_hash_secret',
      expect.objectContaining({ secretName: 'HASH_SECRET' })
    );
  });

  it('creates scoped secrets and verifies signatures', () => {
    const { service } = loadService({ HASH_SECRET: 'demo-hash-secret' });

    expect(service.createScopedSecret('provider', 7)).toBe('demo-hash-secret:provider:7');

    const signature = service.generateSignature({ recordId: 5, role: 'provider' });
    expect(service.verifySignature({ recordId: 5, role: 'provider' }, signature)).toBe(true);

    const explicitSignature = service.generateSignature({ recordId: 5 }, 'explicit-secret');
    expect(service.verifySignature({ recordId: 5 }, explicitSignature, 'explicit-secret')).toBe(true);
  });

  it('fails closed when PLATFORM_PRIVATE_KEY is missing and signs when present', () => {
    let loaded = loadService({ HASH_SECRET: 'demo-hash-secret', PLATFORM_PRIVATE_KEY: '' });

    expect(() => loaded.service.generatePlatformSignature(8)).toThrow(
      'PLATFORM_PRIVATE_KEY is required for platform signature generation.'
    );
    expect(loaded.logger.error).toHaveBeenCalledWith(
      'credentialService',
      'missing_platform_private_key',
      expect.objectContaining({ secretName: 'PLATFORM_PRIVATE_KEY' })
    );

    loaded = loadService({
      HASH_SECRET: 'demo-hash-secret',
      PLATFORM_PRIVATE_KEY: 'platform-signing-secret',
    });

    const platformSignature = loaded.service.generatePlatformSignature(8);
    expect(
      loaded.service.verifySignature({ recordId: 8 }, platformSignature, 'platform-signing-secret')
    ).toBe(true);
  });
});
