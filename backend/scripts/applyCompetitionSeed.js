'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { buildCompetitionSeedSqlBundle } = require('../src/data/competitionSeedSql');
const { COMPETITION_SEED_ASSETS } = require('../src/data/competitionSeedAssets');

const ROOT_DIR = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const OUTPUT_DIR = path.join(ROOT_DIR, 'generated', 'competition-seed');
const SQL_FILE = path.join(OUTPUT_DIR, COMPETITION_SEED_ASSETS.files.bootstrapSql);
const SUMMARY_FILE = path.join(OUTPUT_DIR, COMPETITION_SEED_ASSETS.files.bootstrapSummary);

function ensureSqlBundle() {
  if (!fs.existsSync(SQL_FILE)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const bundle = buildCompetitionSeedSqlBundle();
    fs.writeFileSync(SQL_FILE, bundle.sql, 'utf8');
    fs.writeFileSync(
      SUMMARY_FILE,
      `${JSON.stringify(
        {
          generatedAt: bundle.generatedAt,
          manifestVersion: bundle.manifestVersion,
          outputDir: OUTPUT_DIR,
          outputFiles: bundle.outputFiles,
          importOrder: bundle.importOrder,
          clearOrder: bundle.clearOrder,
          tableCounts: bundle.tableCounts,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
    return bundle;
  }

  return null;
}

function buildConnectionConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yinban',
    charset: 'utf8mb4',
    multipleStatements: true,
  };
}

async function applyCompetitionSeed({ dryRun = false } = {}) {
  const generatedBundle = ensureSqlBundle();
  const sqlText = fs.readFileSync(SQL_FILE, 'utf8');
  const connectionConfig = buildConnectionConfig();
  const response = {
    dryRun,
    generatedSql: Boolean(generatedBundle),
    sqlFile: SQL_FILE,
    summaryFile: SUMMARY_FILE,
    connection: {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: connectionConfig.user,
    },
  };

  if (dryRun) {
    return {
      ...response,
      status: 'ready',
      statementsLength: sqlText.length,
    };
  }

  const connection = await mysql.createConnection(connectionConfig);
  try {
    await connection.query(sqlText);
    return {
      ...response,
      status: 'applied',
      statementsLength: sqlText.length,
      appliedAt: new Date().toISOString(),
    };
  } finally {
    await connection.end();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || String(process.env.COMPETITION_SEED_DRY_RUN || '').trim() === '1';
  const result = await applyCompetitionSeed({ dryRun });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err.stack || err.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  applyCompetitionSeed,
  buildConnectionConfig,
};
