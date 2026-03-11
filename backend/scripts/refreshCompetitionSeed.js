'use strict';

const fs = require('fs');
const path = require('path');
const { snapshotCompetitionSeedDb } = require('./snapshotCompetitionSeedDb');
const { applyCompetitionSeed } = require('./applyCompetitionSeed');
const { verifyCompetitionSeed } = require('./verifyCompetitionSeed');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'generated', 'competition-seed');
const REFRESH_REPORT_FILE = path.join(OUTPUT_DIR, COMPETITION_SEED_ASSETS.files.latestRefreshReport);
const VERIFICATION_FILE = path.join(OUTPUT_DIR, COMPETITION_SEED_ASSETS.files.latestVerification);

async function refreshCompetitionSeed({ dryRun = false } = {}) {
  const snapshot = await snapshotCompetitionSeedDb({ dryRun });
  const applyResult = await applyCompetitionSeed({ dryRun });
  const verification = await verifyCompetitionSeed({ dryRun });

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    snapshot,
    apply: applyResult,
    verification,
    status: dryRun
      ? 'ready'
      : applyResult.status === 'applied' && verification.status === 'verified'
        ? 'refreshed'
        : 'failed',
  };

  if (!dryRun) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(VERIFICATION_FILE, `${JSON.stringify(verification, null, 2)}\n`, 'utf8');
    fs.writeFileSync(REFRESH_REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  return report;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || String(process.env.COMPETITION_SEED_DRY_RUN || '').trim() === '1';
  const result = await refreshCompetitionSeed({ dryRun });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  refreshCompetitionSeed,
};
