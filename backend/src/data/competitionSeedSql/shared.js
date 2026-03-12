'use strict';

const INSERT_ORDER = [
  'users',
  'community_admins',
  'emergency_contacts',
  'family_bindings',
  'health_archives',
  'medication_plans',
  'medication_logs',
  'location_records',
  'sos_events',
  'service_orders',
  'volunteer_attendance_logs',
  'time_accounts',
  'service_records',
  'exchange_records',
  'online_consultations',
  'appointments',
  'medical_reports',
  'audit_logs',
];

const CLEAR_ORDER = [...INSERT_ORDER].reverse();

function pad(num) {
  return String(num).padStart(2, '0');
}

function toMysqlDateTime(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return `${value} 00:00:00`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return sqlValue(JSON.stringify(value));
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildInsert(tableName, columns, rows) {
  if (!rows.length) return `-- ${tableName}: no rows\n`;
  const values = rows
    .map((row) => `  (${columns.map((column) => sqlValue(row[column])).join(', ')})`)
    .join(',\n');

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n${values};\n`;
}

module.exports = {
  INSERT_ORDER,
  CLEAR_ORDER,
  toMysqlDateTime,
  buildInsert,
};
