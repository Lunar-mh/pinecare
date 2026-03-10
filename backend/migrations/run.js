'use strict';

const fs = require('fs');
const path = require('path');

const { pool, query } = require('../src/config/database');

const MIGRATIONS_DIR = __dirname;

function getFilePrefix(filename) {
  const raw = filename.split('_')[0];
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function getKindWeight(filename) {
  if (filename.includes('create_')) return 0;
  if (filename.includes('add_')) return 1;
  return 2;
}

function splitSqlStatements(sqlText) {
  const withoutBlockComments = sqlText.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments.replace(/^\s*--.*$/gm, '');
  return withoutLineComments
    .split(/;\s*(?:\r?\n|$)/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function ensureMigrationsHistoryTable() {
  await query(
    [
      'CREATE TABLE IF NOT EXISTS migrations_history (',
      '  id INT AUTO_INCREMENT PRIMARY KEY,',
      '  filename VARCHAR(255) NOT NULL UNIQUE,',
      '  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      ')',
    ].join('\n'),
  );
}

async function getExecutedMigrations() {
  const [rows] = await query('SELECT filename FROM migrations_history');
  return new Set(rows.map((r) => r.filename));
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => {
      const prefixA = getFilePrefix(a);
      const prefixB = getFilePrefix(b);
      if (prefixA !== prefixB) return prefixA - prefixB;

      const kindA = getKindWeight(a);
      const kindB = getKindWeight(b);
      if (kindA !== kindB) return kindA - kindB;

      return a.localeCompare(b);
    });
}

function parseSqlTables(sqlText) {
  const creates = new Set();
  const requires = new Set();

  const createRe = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?([a-zA-Z0-9_]+)`?/gi;
  const referencesRe = /REFERENCES\s+`?([a-zA-Z0-9_]+)`?/gi;
  const alterRe = /ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?/gi;

  let m;
  while ((m = createRe.exec(sqlText)) !== null) {
    creates.add(m[1]);
  }

  while ((m = referencesRe.exec(sqlText)) !== null) {
    requires.add(m[1]);
  }

  while ((m = alterRe.exec(sqlText)) !== null) {
    requires.add(m[1]);
  }

  return { creates, requires };
}

function topologicalSort(files, depsMap) {
  const indegree = new Map();
  const adj = new Map();

  for (const f of files) {
    indegree.set(f, 0);
    adj.set(f, new Set());
  }

  for (const [f, deps] of depsMap.entries()) {
    for (const dep of deps) {
      if (!indegree.has(dep)) continue;
      if (!adj.has(dep)) adj.set(dep, new Set());

      if (!adj.get(dep).has(f)) {
        adj.get(dep).add(f);
        indegree.set(f, (indegree.get(f) || 0) + 1);
      }
    }
  }

  const baseSort = (a, b) => {
    const prefixA = getFilePrefix(a);
    const prefixB = getFilePrefix(b);
    if (prefixA !== prefixB) return prefixA - prefixB;

    const kindA = getKindWeight(a);
    const kindB = getKindWeight(b);
    if (kindA !== kindB) return kindA - kindB;

    return a.localeCompare(b);
  };

  const ready = [];
  for (const f of files) {
    if ((indegree.get(f) || 0) === 0) ready.push(f);
  }
  ready.sort(baseSort);

  const result = [];
  while (ready.length > 0) {
    const f = ready.shift();
    result.push(f);

    for (const next of adj.get(f) || []) {
      indegree.set(next, (indegree.get(next) || 0) - 1);
      if ((indegree.get(next) || 0) === 0) {
        ready.push(next);
      }
    }
    ready.sort(baseSort);
  }

  if (result.length !== files.length) {
    // 出现循环依赖时退化为基础排序，保证可执行
    const fallback = [...files].sort(baseSort);
    return { ordered: fallback, hadCycle: true };
  }

  return { ordered: result, hadCycle: false };
}

function getMigrationFilesInOrder() {
  const files = getMigrationFiles();
  const fileInfo = new Map();
  const tableCreator = new Map();

  for (const filename of files) {
    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const sqlText = fs.readFileSync(fullPath, 'utf8');
    const info = parseSqlTables(sqlText);
    fileInfo.set(filename, info);

    for (const table of info.creates) {
      if (!tableCreator.has(table)) {
        tableCreator.set(table, filename);
      }
    }
  }

  const depsMap = new Map();
  for (const filename of files) {
    const info = fileInfo.get(filename);
    const deps = new Set();

    for (const table of info.requires) {
      const creator = tableCreator.get(table);
      if (creator && creator !== filename) {
        deps.add(creator);
      }
    }

    depsMap.set(filename, deps);
  }

  const sortResult = topologicalSort(files, depsMap);
  return { ...sortResult, fileInfo };
}

async function executeMigrationFile(filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sqlText = fs.readFileSync(fullPath, 'utf8');
  const statements = splitSqlStatements(sqlText);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const statement of statements) {
      await conn.execute(statement);
    }

    await conn.execute(
      'INSERT INTO migrations_history (filename) VALUES (?) ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP',
      [filename],
    );
    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // 回滚失败不覆盖原始错误
    }
    throw err;
  } finally {
    conn.release();
  }
}

async function allCreatedTablesExist(createdTables) {
  if (!createdTables || createdTables.size === 0) return true;

  for (const tableName of createdTables) {
    const [rows] = await query(
      'SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [tableName],
    );
    const cnt = rows && rows[0] ? Number(rows[0].cnt) : 0;
    if (cnt <= 0) return false;
  }

  return true;
}

async function runMigrations() {
  console.log('========================================');
  console.log('开始数据库迁移...');
  console.log('========================================');

  await ensureMigrationsHistoryTable();
  const executed = await getExecutedMigrations();
  const { ordered: files, hadCycle, fileInfo } = getMigrationFilesInOrder();
  if (hadCycle) {
    console.warn('[迁移] 检测到可能的循环依赖，已退化为基础排序执行');
  }

  let executedCount = 0;
  let skippedCount = 0;

  for (const filename of files) {
    if (executed.has(filename)) {
      const info = fileInfo ? fileInfo.get(filename) : null;
      const ok = await allCreatedTablesExist(info ? info.creates : new Set());
      if (ok) {
        console.log(`[跳过] ${filename}（已执行）`);
        skippedCount += 1;
        continue;
      }

      console.warn(`[重跑] ${filename}（历史记录存在但检测到表缺失）`);
    }

    console.log(`[执行] ${filename}`);
    try {
      await executeMigrationFile(filename);
      console.log(`[完成] ${filename}`);
      executedCount += 1;
    } catch (err) {
      console.error(`[失败] ${filename}`);
      console.error(`错误: ${err.message}`);
      throw err;
    }
  }

  console.log('========================================');
  console.log(`迁移完成：执行 ${executedCount} 个，跳过 ${skippedCount} 个`);
  console.log('========================================');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
