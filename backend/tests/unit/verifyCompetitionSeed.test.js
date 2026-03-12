'use strict';

const { verifyCompetitionSeed } = require('../../scripts/verifyCompetitionSeed');

describe('verifyCompetitionSeed', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('supports dry-run and returns chain expectations without database writes', async () => {
    process.env = {
      ...originalEnv,
      DB_PORT: '3307',
    };

    const result = await verifyCompetitionSeed({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.expectedCounts.users).toBe(89);
    expect(result.chainChecks).toHaveLength(5);
    expect(result.commands).toContain('npm run seed:competition:verify');
    expect(result.repositoryDefaults).toEqual({
      host: '127.0.0.1',
      port: 13307,
      database: 'yinban',
      user: 'yinban',
    });
    expect(result.connection.port).toBe(3307);
    expect(result.connectionResolution.source).toBe('local-env-override');
    expect(result.connectionResolution.overriddenKeys).toEqual(
      expect.arrayContaining(['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'])
    );
  });
});
