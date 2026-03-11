'use strict';

const { verifyCompetitionSeed } = require('../../scripts/verifyCompetitionSeed');

describe('verifyCompetitionSeed', () => {
  it('supports dry-run and returns chain expectations without database writes', async () => {
    const result = await verifyCompetitionSeed({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.expectedCounts.users).toBe(89);
    expect(result.chainChecks).toHaveLength(5);
    expect(result.commands).toContain('npm run seed:competition:verify');
  });
});
