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
      execute: jest.fn().mockResolvedValue([[{ id: 1 }], ['fields']]),
    };
    const createPool = jest.fn(() => pool);

    jest.doMock('mysql2/promise', () => ({ createPool }));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    process.env = {
      ...originalEnv,
      DB_HOST: 'mysql.local',
      DB_PORT: '3307',
      DB_USER: 'tester',
      DB_PASSWORD: 'secret',
      DB_NAME: 'yinban_test',
    };

    const database = require('../../src/config/database');
    const result = await database.query('SELECT 1', ['a']);

    expect(createPool).toHaveBeenCalledWith({
      host: 'mysql.local',
      port: 3307,
      user: 'tester',
      password: 'secret',
      database: 'yinban_test',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
    expect(database.pool).toBe(pool);
    expect(result).toEqual([[{ id: 1 }], ['fields']]);
    expect(pool.execute).toHaveBeenCalledWith('SELECT 1', ['a']);

    const [, handler] = pool.on.mock.calls[0];
    handler({ message: 'db down' });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('MySQL'), 'db down');
  });
});
