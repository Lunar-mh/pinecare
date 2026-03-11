'use strict';

describe('runtimeMode', () => {
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
    return require('../../src/config/runtimeMode');
  }

  it('normalizes boolean-like flags', () => {
    const { normalizeBoolean } = loadModule();

    expect(normalizeBoolean('1')).toBe(true);
    expect(normalizeBoolean(' true ')).toBe(true);
    expect(normalizeBoolean('YES')).toBe(true);
    expect(normalizeBoolean('on')).toBe(true);
    expect(normalizeBoolean('no')).toBe(false);
  });

  it('resolves mode from explicit env precedence', () => {
    let runtime = loadModule({ PRODUCTION_LIVE: '1', COMPETITION_SANDBOX: '1' });
    expect(runtime.resolveMode()).toBe(runtime.MODES.PRODUCTION_LIVE);
    expect(runtime.isProductionLive()).toBe(true);
    expect(runtime.isCompetitionSandbox()).toBe(false);

    runtime = loadModule({ PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '1', RUNTIME_MODE: '' });
    expect(runtime.resolveMode()).toBe(runtime.MODES.COMPETITION_SANDBOX);
    expect(runtime.isCompetitionSandbox()).toBe(true);

    runtime = loadModule({ PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '0', RUNTIME_MODE: 'PRODUCTION_LIVE' });
    expect(runtime.resolveMode()).toBe(runtime.MODES.PRODUCTION_LIVE);

    runtime = loadModule({ PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '0', RUNTIME_MODE: 'competition_sandbox' });
    expect(runtime.resolveMode()).toBe(runtime.MODES.COMPETITION_SANDBOX);

    runtime = loadModule({ PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '0', RUNTIME_MODE: '', NODE_ENV: 'production' });
    expect(runtime.resolveMode()).toBe(runtime.MODES.PRODUCTION_LIVE);

    runtime = loadModule({ PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '0', RUNTIME_MODE: '', NODE_ENV: 'test' });
    expect(runtime.resolveMode()).toBe(runtime.MODES.COMPETITION_SANDBOX);
  });

  it('applies resolved mode back into env flags', () => {
    let runtime = loadModule({ PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '0', RUNTIME_MODE: 'PRODUCTION_LIVE' });
    expect(runtime.applyRuntimeModeEnv()).toBe(runtime.MODES.PRODUCTION_LIVE);
    expect(process.env.RUNTIME_MODE).toBe(runtime.MODES.PRODUCTION_LIVE);
    expect(process.env.PRODUCTION_LIVE).toBe('1');
    expect(process.env.COMPETITION_SANDBOX).toBe('0');

    runtime = loadModule({ PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '1', RUNTIME_MODE: '' });
    expect(runtime.applyRuntimeModeEnv()).toBe(runtime.MODES.COMPETITION_SANDBOX);
    expect(process.env.RUNTIME_MODE).toBe(runtime.MODES.COMPETITION_SANDBOX);
    expect(process.env.PRODUCTION_LIVE).toBe('0');
    expect(process.env.COMPETITION_SANDBOX).toBe('1');
  });
});
