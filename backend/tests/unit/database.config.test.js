'use strict';

describe('config/database', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('creates mysql pool and delegates query execution', async () => {
    const pool = {
      on: jest.fn(),
      query: jest.fn().mockResolvedValue([[{ id: 1 }], ['fields']]),
    };
    const createPool = jest.fn(() => pool);

    jest.doMock('mysql2/promise', () => ({ createPool }));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    process.env = {
      ...originalEnv,
      DB_HOST: 'mysql.local',
      DB_PORT: '13307',
      DB_USER: 'tester',
      DB_PASSWORD: 'secret',
      DB_NAME: 'yinban_test',
    };

    const database = require('../../src/config/database');
    const result = await database.query('SELECT 1', ['a']);

    expect(createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mysql.local',
        port: 13307,
        user: 'tester',
        password: 'secret',
        database: 'yinban_test',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 100,
        charset: 'utf8mb4',
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 10000,
      })
    );
    expect(database.pool).toBe(pool);
    expect(result).toEqual([[{ id: 1 }], ['fields']]);
    expect(pool.query).toHaveBeenCalledWith('SELECT 1', ['a']);

    const [, handler] = pool.on.mock.calls[0];
    handler({ message: 'db down' });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"module":"database"'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });

  it('uses repository defaults when db env vars are absent', () => {
    const pool = {
      on: jest.fn(),
      execute: jest.fn(),
    };
    const createPool = jest.fn(() => pool);

    jest.doMock('mysql2/promise', () => ({ createPool }));

    process.env = {
      ...originalEnv,
    };
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;

    require('../../src/config/database');

    expect(createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '127.0.0.1',
        port: 13307,
        user: 'yinban',
        password: 'yinban_password',
        database: 'yinban',
      })
    );
  });
});
