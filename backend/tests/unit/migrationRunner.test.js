'use strict';

jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  pool: {
    getConnection: jest.fn(),
  },
  query: jest.fn(),
}));

const fs = require('fs');
const { pool, query } = require('../../src/config/database');
const migrationRunner = require('../../migrations/run');

describe('migration runner smoke', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.MIGRATION_STRICT_SEQUENCE;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('splits SQL statements while stripping comments', () => {
    const statements = migrationRunner.splitSqlStatements(`
      -- line comment
      CREATE TABLE users (id INT);
      /* block comment */
      ALTER TABLE users ADD COLUMN nickname VARCHAR(20);
    `);

    expect(statements).toEqual([
      'CREATE TABLE users (id INT)',
      'ALTER TABLE users ADD COLUMN nickname VARCHAR(20)',
    ]);
  });

  it('collects duplicate prefixes for compatibility reporting', () => {
    expect(
      migrationRunner.collectDuplicatePrefixes([
        '001_create_users.sql',
        '001_create_profiles.sql',
        '002_add_index.sql',
      ])
    ).toEqual([
      {
        prefix: 1,
        files: ['001_create_profiles.sql', '001_create_users.sql'],
      },
    ]);
  });

  it('rejects duplicate prefixes when strict sequence enforcement is enabled', () => {
    process.env.MIGRATION_STRICT_SEQUENCE = '1';

    expect(() =>
      migrationRunner.enforceMigrationPrefixPolicy([
        '001_create_users.sql',
        '001_create_profiles.sql',
      ])
    ).toThrow(/strictly increasing/i);
  });

  it('orders migrations by dependency when foreign keys require earlier tables', () => {
    fs.readdirSync.mockReturnValue([
      '010_add_user_profile.sql',
      '001_create_users.sql',
      '002_create_profiles.sql',
    ]);
    fs.readFileSync.mockImplementation((fullPath) => {
      const file = String(fullPath);
      if (file.includes('001_create_users.sql')) {
        return 'CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY);';
      }
      if (file.includes('002_create_profiles.sql')) {
        return 'CREATE TABLE IF NOT EXISTS profiles (id INT PRIMARY KEY, user_id INT, CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id));';
      }
      return 'ALTER TABLE profiles ADD COLUMN age INT;';
    });

    const result = migrationRunner.getMigrationFilesInOrder();

    expect(result.hadCycle).toBe(false);
    expect(result.ordered).toEqual([
      '001_create_users.sql',
      '002_create_profiles.sql',
      '010_add_user_profile.sql',
    ]);
  });

  it('replays executed migrations when history exists but created tables are missing', async () => {
    const connection = {
      beginTransaction: jest.fn(),
      execute: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    pool.getConnection.mockResolvedValue(connection);
    fs.readdirSync.mockReturnValue(['001_create_users.sql']);
    fs.readFileSync.mockReturnValue('CREATE TABLE IF NOT EXISTS `users` (id INT PRIMARY KEY);');
    query.mockImplementation(async (sql) => {
      const text = String(sql);
      if (text.includes('CREATE TABLE IF NOT EXISTS migrations_history')) {
        return [{}];
      }
      if (text.includes('SELECT filename FROM migrations_history')) {
        return [[{ filename: '001_create_users.sql' }]];
      }
      if (text.includes('information_schema.tables')) {
        return [[{ cnt: 0 }]];
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    await migrationRunner.runMigrations();

    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.execute).toHaveBeenCalledWith('CREATE TABLE IF NOT EXISTS `users` (id INT PRIMARY KEY)');
    expect(connection.execute).toHaveBeenCalledWith(
      'INSERT INTO migrations_history (filename) VALUES (?) ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP',
      ['001_create_users.sql']
    );
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
