'use strict';

const { query } = require('../config/database');
const redis = require('../config/redis');
const { getServerRole } = require('../config/http');
const { resolveMode } = require('../config/runtimeMode');
const { getRecentThirdPartyErrors } = require('../utils/thirdParty');
const { getJobStatus } = require('../jobs');
const { getCareEventAuditDiagnostics } = require('./eventTimelineService');

const KEY_TABLES = [
  'users',
  'health_records',
  'medication_logs',
  'sos_events',
  'fall_events',
  'location_records',
  'medical_reports',
  'audit_logs',
];

async function checkMysql() {
  try {
    await query('SELECT 1');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', detail: err.message };
  }
}

async function checkRedis() {
  try {
    await redis.ping();
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', detail: err.message };
  }
}

async function checkKeyTables() {
  try {
    const placeholders = KEY_TABLES.map(() => '?').join(', ');
    const [rows] = await query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name IN (${placeholders})`,
      KEY_TABLES
    );

    const existing = new Set((rows || []).map((row) => String(row.table_name || row.TABLE_NAME || '')));
    const missing = KEY_TABLES.filter((tableName) => !existing.has(tableName));

    return {
      status: missing.length === 0 ? 'ok' : 'error',
      checked: KEY_TABLES,
      missing,
    };
  } catch (err) {
    return {
      status: 'error',
      checked: KEY_TABLES,
      missing: KEY_TABLES,
      detail: err.message,
    };
  }
}

async function getHealthStatus() {
  const [mysql, redisState, keyTables] = await Promise.all([
    checkMysql(),
    checkRedis(),
    checkKeyTables(),
  ]);
  const jobs = getJobStatus();
  const recentErrors = getRecentThirdPartyErrors(5);
  const careEventAudit = getCareEventAuditDiagnostics(5);
  const workerHealthy = jobs.serverRole !== 'worker' || !jobs.enabled || jobs.started;
  const healthy =
    mysql.status === 'ok' &&
    redisState.status === 'ok' &&
    keyTables.status === 'ok' &&
    workerHealthy;

  return {
    healthy,
    data: {
      status: healthy ? 'ok' : 'degraded',
      runtimeMode: resolveMode(),
      serverRole: getServerRole(),
      mysql,
      redis: redisState,
      keyTables,
      jobs,
      thirdPartyErrors: {
        recentCount: recentErrors.length,
        items: recentErrors,
      },
      careEventAudit,
    },
  };
}

function getLivenessStatus() {
  return {
    status: 'ok',
    runtimeMode: resolveMode(),
    serverRole: getServerRole(),
    jobs: getJobStatus(),
  };
}

async function getReadinessStatus() {
  const result = await getHealthStatus();
  return {
    ready: result.healthy,
    data: result.data,
  };
}

module.exports = {
  checkMysql,
  checkRedis,
  checkKeyTables,
  getHealthStatus,
  getLivenessStatus,
  getReadinessStatus,
};
