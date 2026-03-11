'use strict';

const { refreshCompetitionSeed } = require('../../scripts/refreshCompetitionSeed');

describe('refreshCompetitionSeed', () => {
  it('supports dry-run and returns a full staged report', async () => {
    const result = await refreshCompetitionSeed({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.snapshot.status).toBe('ready');
    expect(result.apply.status).toBe('ready');
    expect(result.verification.status).toBe('ready');
  });
});
