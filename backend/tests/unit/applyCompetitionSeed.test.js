'use strict';

const { applyCompetitionSeed, buildConnectionConfig } = require('../../scripts/applyCompetitionSeed');

describe('applyCompetitionSeed', () => {
  it('builds mysql connection config from environment defaults', () => {
    const original = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME,
    };

    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = '13307';
    process.env.DB_USER = 'yinban';
    process.env.DB_PASSWORD = 'secret';
    process.env.DB_NAME = 'yinban_demo';

    const config = buildConnectionConfig();
    expect(config).toEqual(
      expect.objectContaining({
        host: '127.0.0.1',
        port: 13307,
        user: 'yinban',
        password: 'secret',
        database: 'yinban_demo',
        multipleStatements: true,
      })
    );

    Object.assign(process.env, original);
  });

  it('supports dry-run without touching the database', async () => {
    const result = await applyCompetitionSeed({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.sqlFile).toContain('bootstrap.sql');
    expect(result.statementsLength).toBeGreaterThan(1000);
  });
});

