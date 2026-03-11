'use strict';

describe('integrationMode', () => {
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
    return require('../../src/config/integrationMode');
  }

  it('keeps auto mode in sandbox as stub when live config is missing', () => {
    const { resolveIntegrationMode } = loadModule({
      PRODUCTION_LIVE: '0',
      COMPETITION_SANDBOX: '1',
    });

    expect(resolveIntegrationMode({ requestedMode: 'auto', liveConfigured: false })).toMatchObject({
      requestedMode: 'auto',
      effectiveMode: 'stub',
      fallbackAllowed: true,
      stubAllowed: true,
    });
  });

  it('promotes auto mode to live when config exists', () => {
    const { resolveIntegrationMode } = loadModule({
      PRODUCTION_LIVE: '0',
      COMPETITION_SANDBOX: '1',
    });

    expect(resolveIntegrationMode({ requestedMode: 'auto', liveConfigured: true })).toMatchObject({
      effectiveMode: 'live',
      fallbackAllowed: true,
      stubAllowed: false,
    });
  });

  it('disables stub fallback in production live', () => {
    const { resolveIntegrationMode } = loadModule({
      PRODUCTION_LIVE: '1',
      COMPETITION_SANDBOX: '0',
      RUNTIME_MODE: 'PRODUCTION_LIVE',
    });

    expect(resolveIntegrationMode({ requestedMode: 'stub', liveConfigured: false })).toMatchObject({
      effectiveMode: 'stub',
      fallbackAllowed: false,
      stubAllowed: false,
    });
  });

  it('normalizes unsupported modes and checks required env keys', () => {
    const { normalizeRequestedMode, hasRequiredEnv } = loadModule({
      FIRST_KEY: 'value',
      SECOND_KEY: ' ',
    });

    expect(normalizeRequestedMode('LIVE')).toBe('live');
    expect(normalizeRequestedMode('weird-mode', 'mock')).toBe('mock');
    expect(hasRequiredEnv(['FIRST_KEY'])).toBe(true);
    expect(hasRequiredEnv(['FIRST_KEY', 'SECOND_KEY'])).toBe(false);
  });
});
