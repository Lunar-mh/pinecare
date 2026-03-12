'use strict';

const fs = require('fs');
const path = require('path');
const migrationRunner = require('../migrations/run');
const { verifyCompetitionSeed } = require('./verifyCompetitionSeed');

const ROOT_DIR = path.join(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function runFreshInstallSmoke(options = {}) {
  const dryRun = options.dryRun !== false;
  const packageJson = readJson(path.join(ROOT_DIR, 'package.json'));
  const scripts = packageJson.scripts || {};
  const requiredScripts = [
    'lint',
    'test',
    'migrate',
    'seed:competition:sql',
    'seed:competition:verify',
  ];
  const missingScripts = requiredScripts.filter((key) => !scripts[key]);
  const requiredFiles = [
    '.env.example',
    '.env.production-live.example',
    'docs/deployment-playbook.md',
    'docs/compliance-and-contest-package.md',
    'docs/four-end-release-candidate.md',
    'docs/real-data-evidence-pack.md',
    'docs/live-cutover-handover.md',
    'docs/live-evidence-templates.md',
    'docs/error-message-spec.md',
    'docs/defense-evidence-checklist.md',
    'docs/release-known-issues.md',
    'docs/privacy-policy.md',
    'docs/user-agreement.md',
    'docs/medical-disclaimer.md',
    'docs/ai-usage-notice.md',
    'docs/third-party-services-and-authorizations.md',
    'docs/data-desensitization-note.md',
  ];
  const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(ROOT_DIR, file)));
  const migrationInfo = migrationRunner.getMigrationFilesInOrder();
  const seedVerification = await verifyCompetitionSeed({ dryRun: true });

  const result = {
    dryRun,
    generatedAt: new Date().toISOString(),
    scripts: {
      required: requiredScripts,
      missing: missingScripts,
    },
    files: {
      required: requiredFiles,
      missing: missingFiles,
    },
    migrations: {
      total: migrationInfo.ordered.length,
      hadCycle: migrationInfo.hadCycle,
      first: migrationInfo.ordered[0] || null,
      last: migrationInfo.ordered[migrationInfo.ordered.length - 1] || null,
    },
    competitionSeed: {
      status: seedVerification.status,
      manifestVersion: seedVerification.manifestVersion,
      chainChecks: Array.isArray(seedVerification.chainChecks)
        ? seedVerification.chainChecks.length
        : 0,
    },
  };

  result.status =
    missingScripts.length === 0 &&
    missingFiles.length === 0 &&
    !migrationInfo.hadCycle &&
    seedVerification.status === 'ready'
      ? 'ready'
      : 'failed';

  return result;
}

async function main() {
  const result = await runFreshInstallSmoke({ dryRun: true });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== 'ready') {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  runFreshInstallSmoke,
};
