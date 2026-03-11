'use strict';

const { snapshotCompetitionSeedDb } = require('../../scripts/snapshotCompetitionSeedDb');

describe('snapshotCompetitionSeedDb', () => {
  it('supports dry-run and exposes tracked tables', async () => {
    const result = await snapshotCompetitionSeedDb({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.trackedTables).toContain('users');
    expect(result.trackedTables).toContain('medical_reports');
    expect(result.snapshotFile).toContain('latest-db-snapshot.json');
  });
});
