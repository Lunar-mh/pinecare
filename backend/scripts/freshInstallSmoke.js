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
    'test:unit',
    'test:integration',
    'test:security',
    'test:performance',
    'audit:performance',
    'migrate',
    'seed:competition:sql',
    'seed:competition:verify',
  ];
  const missingScripts = requiredScripts.filter((key) => !scripts[key]);
  const requiredFiles = [
    '.env.example',
    '.env.production-live.example',
    'docs/法律与隐私合规协议.md',
    'docs/系统部署与验收白皮书.md',
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
