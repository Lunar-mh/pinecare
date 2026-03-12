'use strict';

const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const logger = require('./logger');

const MIGRATION_PREFIX = '003_';

function splitSqlStatements(sqlText) {
  return sqlText
    .split(/;\s*\n/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !item.startsWith('--'));
}

async function runMigrations() {
  const migrationDir = path.join(__dirname, '../../migrations');
  const files = fs
    .readdirSync(migrationDir)
    .filter((name) => name.startsWith(MIGRATION_PREFIX) && name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    logger.info('migrate', 'no_matching_files', { prefix: MIGRATION_PREFIX });
    return;
  }

  for (const file of files) {
    const fullPath = path.join(migrationDir, file);
    const sqlText = fs.readFileSync(fullPath, 'utf8');
    const statements = splitSqlStatements(sqlText);

    logger.info('migrate', 'file_started', { file });

    for (const statement of statements) {
      await query(statement);
    }

    logger.info('migrate', 'file_completed', { file });
  }

  logger.info('migrate', 'completed', { prefix: MIGRATION_PREFIX, count: files.length });
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      logger.error('migrate', 'failed', { message: err.message });
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
};
