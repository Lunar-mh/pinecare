'use strict';

const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

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
    console.log('未找到可执行的003迁移文件');
    return;
  }

  for (const file of files) {
    const fullPath = path.join(migrationDir, file);
    const sqlText = fs.readFileSync(fullPath, 'utf8');
    const statements = splitSqlStatements(sqlText);

    console.log(`开始执行迁移: ${file}`);

    for (const statement of statements) {
      await query(statement);
    }

    console.log(`迁移执行完成: ${file}`);
  }

  console.log('所有003迁移执行完成');
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('迁移执行失败:', err.message);
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
};
