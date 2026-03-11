'use strict';

describe('server lifecycle', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('stops jobs and closes resources on SIGTERM', async () => {
    const handlers = {};
    const close = jest.fn((cb) => cb());
    const listen = jest.fn((_port, cb) => {
      cb();
      return { close };
    });

    jest.doMock('../../src/app', () => ({ listen }));
    jest.doMock('../../src/config/validateEnv', () => ({ validateEnv: jest.fn() }));
    jest.doMock('../../src/config/runtimeMode', () => ({ resolveMode: jest.fn(() => 'COMPETITION_SANDBOX') }));
    jest.doMock('../../src/config/database', () => ({ closePool: jest.fn().mockResolvedValue(undefined) }));
    jest.doMock('../../src/config/redis', () => ({ closeRedis: jest.fn().mockResolvedValue(undefined) }));
    jest.doMock('../../src/jobs', () => ({ stopMedicationJobs: jest.fn() }));
    jest.doMock('../../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
    const onSpy = jest.spyOn(process, 'on').mockImplementation((signal, handler) => {
      handlers[signal] = handler;
      return process;
    });

    require('../../server');

    expect(onSpy).toHaveBeenCalled();
    handlers.SIGTERM();
    await new Promise((resolve) => setImmediate(resolve));

    const { stopMedicationJobs } = require('../../src/jobs');
    const { closePool } = require('../../src/config/database');
    const redis = require('../../src/config/redis');

    expect(stopMedicationJobs).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(closePool).toHaveBeenCalledTimes(1);
    expect(redis.closeRedis).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
