'use strict';

const fs = require('fs');
const path = require('path');

const { pool, query } = require('../src/config/database');

const MIGRATIONS_DIR = __dirname;
const STRICT_SEQUENCE_ENV = 'MIGRATION_STRICT_SEQUENCE';
const MIGRATION_SEQUENCE_PLAN = [
  '001_create_ai_consult_tables.sql',
  '001_create_user_auth_tables.sql',
  '001_create_community_admin_tables.sql',
  '001_create_time_bank_tables.sql',
  '001_create_fall_tables.sql',
  '002_create_health_archives.sql',
  '003_create_device_bindings.sql',
  '003_create_medication_plans.sql',
  '003_create_medication_logs.sql',
  '003_create_medication_settings.sql',
  '003_create_reminder_queue.sql',
  '003_add_medication_indexes.sql',
  '003_add_settings_queue_indexes.sql',
  '003_add_calendar_index.sql',
  '004_create_health_records.sql',
  '004_create_sos_tables.sql',
  '005_create_notification_settings.sql',
  '005_add_health_archive_indexes.sql',
  '006_create_voice_tables.sql',
  '009_create_drug_interaction_tables.sql',
  '011_create_companion_tables.sql',
  '012_create_family_space_tables.sql',
  '014_create_location_records.sql',
  '014_create_geo_fences.sql',
  '014_create_fence_alerts.sql',
  '015_create_appointments.sql',
  '015_create_medical_reports.sql',
  '015_create_online_consultations.sql',
  '016_create_volunteer_tables.sql',
];
const MIGRATION_SEQUENCE_INDEX = new Map(
  MIGRATION_SEQUENCE_PLAN.map((filename, index) => [filename, index])
);

function getFilePrefix(filename) {
  const raw = filename.split('_')[0];
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function getKindWeight(filename) {
  if (filename.includes('create_')) {
    return 0;
  }
  if (filename.includes('add_')) {
    return 1;
  }
  return 2;
}

function getPlannedOrder(filename) {
  return MIGRATION_SEQUENCE_INDEX.has(filename)
    ? MIGRATION_SEQUENCE_INDEX.get(filename)
    : Number.POSITIVE_INFINITY;
}

function baseSort(a, b) {
  const prefixA = getFilePrefix(a);
  const prefixB = getFilePrefix(b);
  if (prefixA !== prefixB) {
    return prefixA - prefixB;
  }

  const kindA = getKindWeight(a);
  const kindB = getKindWeight(b);
  if (kindA !== kindB) {
    return kindA - kindB;
  }

  return a.localeCompare(b);
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
    ].join('\n')
  );
}

async function getExecutedMigrations() {
  const [rows] = await query('SELECT filename FROM migrations_history');
  return new Set(rows.map((row) => row.filename));
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => {
      const plannedA = getPlannedOrder(a);
      const plannedB = getPlannedOrder(b);
      if (plannedA !== plannedB) {
        return plannedA - plannedB;
      }

      return baseSort(a, b);
    });
}

function collectDuplicatePrefixes(files) {
  const groups = new Map();

  files.forEach((filename) => {
    const prefix = getFilePrefix(filename);
    if (!Number.isFinite(prefix)) {
      return;
    }

    const current = groups.get(prefix) || [];
    current.push(filename);
    groups.set(prefix, current);
  });

  return Array.from(groups.entries())
    .filter(([, names]) => names.length > 1)
    .map(([prefix, names]) => ({ prefix, files: names.slice().sort((a, b) => a.localeCompare(b)) }))
    .sort((left, right) => left.prefix - right.prefix);
}

function shouldEnforceStrictSequence() {
  return String(process.env[STRICT_SEQUENCE_ENV] || '0').trim() === '1';
}

function enforceMigrationPrefixPolicy(files) {
  const duplicates = collectDuplicatePrefixes(files);
  if (duplicates.length === 0) {
    return duplicates;
  }

  const actionable = duplicates.filter((item) =>
    item.files.some((filename) => !MIGRATION_SEQUENCE_INDEX.has(filename))
  );

  if (actionable.length === 0) {
    return duplicates;
  }

  const message = actionable
    .map((item) => `prefix ${item.prefix}: ${item.files.join(', ')}`)
    .join('; ');

  if (shouldEnforceStrictSequence()) {
    throw new Error(`Migration prefixes must be strictly increasing. Duplicate prefixes found: ${message}`);
  }

  console.warn(
    `[warning] Duplicate migration prefixes remain for backward compatibility. New migrations should use unique increasing prefixes: ${message}`
  );
  return duplicates;
}

function parseSqlTables(sqlText) {
  const creates = new Set();
  const requires = new Set();
  const createRe = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?([a-zA-Z0-9_]+)`?/gi;
  const referencesRe = /REFERENCES\s+`?([a-zA-Z0-9_]+)`?/gi;
  const alterRe = /ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?/gi;

  let match;
  while ((match = createRe.exec(sqlText)) !== null) {
    creates.add(match[1]);
  }
  while ((match = referencesRe.exec(sqlText)) !== null) {
    requires.add(match[1]);
  }
  while ((match = alterRe.exec(sqlText)) !== null) {
    requires.add(match[1]);
  }

  return { creates, requires };
}

function topologicalSort(files, depsMap) {
  const indegree = new Map();
  const adjacency = new Map();

  files.forEach((file) => {
    indegree.set(file, 0);
    adjacency.set(file, new Set());
  });

  depsMap.forEach((deps, file) => {
    deps.forEach((dep) => {
      if (!indegree.has(dep)) {
        return;
      }
      if (!adjacency.get(dep).has(file)) {
        adjacency.get(dep).add(file);
        indegree.set(file, (indegree.get(file) || 0) + 1);
      }
    });
  });

  const ready = files.filter((file) => (indegree.get(file) || 0) === 0).sort(baseSort);
  const ordered = [];

  while (ready.length > 0) {
    const current = ready.shift();
    ordered.push(current);

    (adjacency.get(current) || []).forEach((next) => {
      indegree.set(next, (indegree.get(next) || 0) - 1);
      if ((indegree.get(next) || 0) === 0) {
        ready.push(next);
      }
    });

    ready.sort(baseSort);
  }

  if (ordered.length !== files.length) {
    return {
      ordered: [...files].sort(baseSort),
      hadCycle: true,
    };
  }

  return {
    ordered,
    hadCycle: false,
  };
}

function getMigrationFilesInOrder() {
  const files = getMigrationFiles();
  enforceMigrationPrefixPolicy(files);

  const fileInfo = new Map();
  const tableCreator = new Map();

  files.forEach((filename) => {
    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const sqlText = fs.readFileSync(fullPath, 'utf8');
    const info = parseSqlTables(sqlText);
    fileInfo.set(filename, info);

    info.creates.forEach((tableName) => {
      if (!tableCreator.has(tableName)) {
        tableCreator.set(tableName, filename);
      }
    });
  });

  const depsMap = new Map();
  files.forEach((filename) => {
    const info = fileInfo.get(filename);
    const deps = new Set();
    info.requires.forEach((tableName) => {
      const creator = tableCreator.get(tableName);
      if (creator && creator !== filename) {
        deps.add(creator);
      }
    });
    depsMap.set(filename, deps);
  });

  return {
    ...topologicalSort(files, depsMap),
    fileInfo,
  };
}

async function executeMigrationFile(filename) {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sqlText = fs.readFileSync(fullPath, 'utf8');
  const statements = splitSqlStatements(sqlText);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const statement of statements) {
      await connection.execute(statement);
    }

    await connection.execute(
      'INSERT INTO migrations_history (filename) VALUES (?) ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP',
      [filename]
    );
    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_rollbackError) {
      // Ignore rollback errors and keep the original migration failure.
    }
    throw err;
  } finally {
    connection.release();
  }
}

async function allCreatedTablesExist(createdTables) {
  if (!createdTables || createdTables.size === 0) {
    return true;
  }

  for (const tableName of createdTables) {
    const [rows] = await query(
      'SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [tableName]
    );
    const count = rows && rows[0] ? Number(rows[0].cnt) : 0;
    if (count <= 0) {
      return false;
    }
  }

  return true;
}

async function runMigrations() {
  console.log('========================================');
  console.log('Running database migrations...');
  console.log('========================================');

  await ensureMigrationsHistoryTable();
  const executed = await getExecutedMigrations();
  const { ordered: files, hadCycle, fileInfo } = getMigrationFilesInOrder();

  if (hadCycle) {
    console.warn('[warning] Migration dependency graph contains a cycle. Falling back to deterministic filename order.');
  }

  let executedCount = 0;
  let skippedCount = 0;

  for (const filename of files) {
    if (executed.has(filename)) {
      const info = fileInfo ? fileInfo.get(filename) : null;
      const exists = await allCreatedTablesExist(info ? info.creates : new Set());
      if (exists) {
        console.log(`[skip] ${filename} already applied and tables exist.`);
        skippedCount += 1;
        continue;
      }

      console.warn(`[replay] ${filename} exists in history but required tables are missing. Replaying migration.`);
    }

    console.log(`[run] ${filename}`);
    try {
      await executeMigrationFile(filename);
      console.log(`[done] ${filename}`);
      executedCount += 1;
    } catch (err) {
      console.error(`[failed] ${filename}`);
      console.error(`reason: ${err.message}`);
      throw err;
    }
  }

  console.log('========================================');
  console.log(`Migration completed. executed=${executedCount}, skipped=${skippedCount}`);
  console.log('========================================');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = {
  runMigrations,
  splitSqlStatements,
  getMigrationFiles,
  getMigrationFilesInOrder,
  parseSqlTables,
  topologicalSort,
  getFilePrefix,
  getKindWeight,
  getPlannedOrder,
  collectDuplicatePrefixes,
  enforceMigrationPrefixPolicy,
  allCreatedTablesExist,
  executeMigrationFile,
};