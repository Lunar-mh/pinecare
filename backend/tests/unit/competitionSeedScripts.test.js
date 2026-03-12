'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { generateCompetitionSeedJsonArtifacts } = require('../../scripts/exportCompetitionSeed');
const { generateCompetitionSeedSqlArtifacts } = require('../../scripts/exportCompetitionSeedSql');
const { packageCompetitionSeed } = require('../../scripts/packageCompetitionSeed');
const { verifyCompetitionSeed } = require('../../scripts/verifyCompetitionSeed');
const { COMPETITION_SEED_ASSETS } = require('../../src/data/competitionSeedAssets');

describe('competition seed script smoke', () => {
  it('generates JSON seed artifacts into a target directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competition-seed-json-'));
    const result = generateCompetitionSeedJsonArtifacts({ outputDir });

    expect(result.outputDir).toBe(outputDir);
    expect(fs.existsSync(path.join(outputDir, COMPETITION_SEED_ASSETS.files.manifest))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, COMPETITION_SEED_ASSETS.files.summary))).toBe(true);

    const summary = JSON.parse(fs.readFileSync(path.join(outputDir, COMPETITION_SEED_ASSETS.files.summary), 'utf8'));
    expect(summary.outputDir).toBe(outputDir);
    expect(summary.counts.users || summary.counts.elders).toBeDefined();
    expect(summary.counts.communities).toBeGreaterThan(0);
  });

  it('generates SQL bootstrap artifacts into a target directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competition-seed-sql-'));

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

  it('packages JSON and SQL artifacts into a standalone directory', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'competition-seed-package-'));
    const result = packageCompetitionSeed({ outputDir, packageName: 'demo-pack' });

    expect(result.packageDir).toBe(path.join(outputDir, 'demo-pack'));
    expect(fs.existsSync(path.join(result.packageDir, 'json', COMPETITION_SEED_ASSETS.files.summary))).toBe(true);
    expect(fs.existsSync(path.join(result.packageDir, 'sql', COMPETITION_SEED_ASSETS.files.bootstrapSql))).toBe(true);
    expect(fs.existsSync(path.join(result.packageDir, 'package-manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(result.packageDir, 'README.md'))).toBe(true);
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
