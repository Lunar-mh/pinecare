'use strict';

jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const fs = require('fs');
const { query } = require('../../src/config/database');
const logger = require('../../src/utils/logger');
const { runMigrations } = require('../../src/utils/migrate');

describe('utils/migrate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs when no matching migration files exist', async () => {
    fs.readdirSync.mockReturnValue(['001_init.sql', '004_extra.sql']);

    await expect(runMigrations()).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledWith('migrate', 'no_matching_files', { prefix: '003_' });
    expect(query).not.toHaveBeenCalled();
  });

  it('runs sorted matching files and executes split SQL statements', async () => {
    fs.readdirSync.mockReturnValue(['003_b.sql', '003_a.sql', 'ignore.txt']);
    fs.readFileSync
      .mockReturnValueOnce('CREATE TABLE a ();\n;\n-- comment only\nALTER TABLE a ADD COLUMN x INT;\n')
      .mockReturnValueOnce('INSERT INTO a VALUES (1);\n');
    query.mockResolvedValue(true);

    await expect(runMigrations()).resolves.toBeUndefined();

    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(1, 'CREATE TABLE a ()');
    expect(query).toHaveBeenNthCalledWith(2, 'INSERT INTO a VALUES (1)');
    expect(logger.info).toHaveBeenCalledWith('migrate', 'completed', { prefix: '003_', count: 2 });
  });
});
