'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateCompetitionSeedSqlArtifacts } = require('../../scripts/exportCompetitionSeedSql');
const { verifyCompetitionSeed } = require('../../scripts/verifyCompetitionSeed');
const { COMPETITION_SEED_ASSETS } = require('../../src/data/competitionSeedAssets');

describe('competition seed script smoke', () => {
  it('generates SQL bootstrap artifacts into a target directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competition-seed-'));

    const result = generateCompetitionSeedSqlArtifacts({ outputDir });
    const bootstrapSqlPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSql);
    const bootstrapReadmePath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapReadme);
    const bootstrapSummaryPath = path.join(outputDir, COMPETITION_SEED_ASSETS.files.bootstrapSummary);

    expect(result.outputDir).toBe(outputDir);
    expect(fs.existsSync(bootstrapSqlPath)).toBe(true);
    expect(fs.existsSync(bootstrapReadmePath)).toBe(true);
    expect(fs.existsSync(bootstrapSummaryPath)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(bootstrapSummaryPath, 'utf8'));
    expect(summary.outputDir).toBe(outputDir);
    expect(summary.importOrder.length).toBeGreaterThan(0);
    expect(summary.tableCounts.users).toBeGreaterThan(0);
  });

  it('verifies competition seed requirements in dry-run mode without DB access', async () => {
    const result = await verifyCompetitionSeed({ dryRun: true });

    expect(result.status).toBe('ready');
    expect(result.manifestVersion).toBeTruthy();
    expect(result.expectedCounts.users).toBeGreaterThan(0);
    expect(Array.isArray(result.chainChecks)).toBe(true);
    expect(result.chainChecks.length).toBeGreaterThan(0);
  });
});
