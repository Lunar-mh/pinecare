'use strict';

const { query } = require('../config/database');
const redis = require('../config/redis');
const { getServerRole } = require('../config/http');
const { resolveMode } = require('../config/runtimeMode');

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

async function getHealthStatus() {
  const [mysql, redisState] = await Promise.all([checkMysql(), checkRedis()]);
  const healthy = mysql.status === 'ok' && redisState.status === 'ok';

  return {
    healthy,
    data: {
      status: healthy ? 'ok' : 'degraded',
      runtimeMode: resolveMode(),
      serverRole: getServerRole(),
      mysql,
      redis: redisState,
    },
  };
}

function getLivenessStatus() {
  return {
    status: 'ok',
    runtimeMode: resolveMode(),
    serverRole: getServerRole(),
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
  getHealthStatus,
  getLivenessStatus,
  getReadinessStatus,
};
