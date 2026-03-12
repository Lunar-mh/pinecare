'use strict';

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const { buildConnectionConfig, REPOSITORY_DEFAULT_CONNECTION } = require('./applyCompetitionSeed');
const {
  buildExpectedTableCounts,
  buildChainChecks,
} = require('../src/data/competitionSeedVerification');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');
const { COMPETITION_SEED_MANIFEST } = require('../src/data/competitionSeedManifest');

const ROOT_DIR = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

function buildConnectionResolution() {
  const overriddenKeys = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(
    (key) => typeof process.env[key] === 'string' && process.env[key].trim() !== ''
  );

  return {
    source: overriddenKeys.length > 0 ? 'local-env-override' : 'repository-default',
    overriddenKeys,
  };
}

async function queryScalar(connection, sql) {
  const [rows] = await connection.query(sql);
  return Number((rows && rows[0] && rows[0].cnt) || 0);
}

async function verifyCompetitionSeed({ dryRun = false } = {}) {
  const expectedCounts = buildExpectedTableCounts();
  const chainChecks = buildChainChecks();
  const connectionConfig = buildConnectionConfig();
  const connectionResolution = buildConnectionResolution();
  const base = {
    dryRun,
    manifestVersion: COMPETITION_SEED_MANIFEST.version,
    commands: COMPETITION_SEED_ASSETS.commands,
    repositoryDefaults: {
      host: REPOSITORY_DEFAULT_CONNECTION.host,
      port: REPOSITORY_DEFAULT_CONNECTION.port,
      database: REPOSITORY_DEFAULT_CONNECTION.database,
      user: REPOSITORY_DEFAULT_CONNECTION.user,
    },
    connectionResolution,
    connection: {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: connectionConfig.user,
    },
    expectedCounts,
    chainChecks: chainChecks.map((item) => ({
      id: item.id,
      description: item.description,
      expectedMin: item.expectedMin,
    })),
  };

  if (dryRun) {
    return {
      ...base,
      status: 'ready',
    };
  }

  const connection = await mysql.createConnection(connectionConfig);
  try {
    const actualCounts = {};
    const tableResults = [];
    for (const [tableName, expected] of Object.entries(expectedCounts)) {
      const actual = await queryScalar(connection, `SELECT COUNT(*) AS cnt FROM ${tableName}`);
      actualCounts[tableName] = actual;
      tableResults.push({
        tableName,
        expected,
        actual,
        passed: actual === expected,
      });
    }

    const chainResults = [];
    for (const item of chainChecks) {
      const actual = await queryScalar(connection, item.sql);
      chainResults.push({
        id: item.id,
        description: item.description,
        expectedMin: item.expectedMin,
        actual,
        passed: actual >= item.expectedMin,
      });
    }

    return {
      ...base,
      status: tableResults.every((item) => item.passed) && chainResults.every((item) => item.passed) ? 'verified' : 'failed',
      verifiedAt: new Date().toISOString(),
      actualCounts,
      tableResults,
      chainResults,
    };
  } finally {
    await connection.end();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || String(process.env.COMPETITION_SEED_DRY_RUN || '').trim() === '1';
  const result = await verifyCompetitionSeed({ dryRun });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  verifyCompetitionSeed,
};
