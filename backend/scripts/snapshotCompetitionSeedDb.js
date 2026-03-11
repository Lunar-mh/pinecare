'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { buildConnectionConfig } = require('./applyCompetitionSeed');
const { buildExpectedTableCounts } = require('../src/data/competitionSeedVerification');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

const ROOT_DIR = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env') });
const OUTPUT_DIR = path.join(ROOT_DIR, 'generated', 'competition-seed');
const SNAPSHOT_FILE = path.join(OUTPUT_DIR, COMPETITION_SEED_ASSETS.files.latestSnapshot);

async function queryScalar(connection, sql) {
  const [rows] = await connection.query(sql);
  return Number((rows && rows[0] && rows[0].cnt) || 0);
}

async function snapshotCompetitionSeedDb({ dryRun = false } = {}) {
  const connectionConfig = buildConnectionConfig();
  const expectedCounts = buildExpectedTableCounts();
  const base = {
    dryRun,
    snapshotFile: SNAPSHOT_FILE,
    connection: {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: connectionConfig.user,
    },
    trackedTables: Object.keys(expectedCounts),
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
    for (const tableName of Object.keys(expectedCounts)) {
      actualCounts[tableName] = await queryScalar(connection, `SELECT COUNT(*) AS cnt FROM ${tableName}`);
    }

    const snapshot = {
      generatedAt: new Date().toISOString(),
      connection: base.connection,
      actualCounts,
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

    return {
      ...base,
      status: 'snapshotted',
      actualCounts,
      generatedAt: snapshot.generatedAt,
    };
  } finally {
    await connection.end();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || String(process.env.COMPETITION_SEED_DRY_RUN || '').trim() === '1';
  const result = await snapshotCompetitionSeedDb({ dryRun });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  snapshotCompetitionSeedDb,
};
