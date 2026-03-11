'use strict';

const { query } = require('../config/database');
const redis = require('../config/redis');
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
      mysql,
      redis: redisState,
    },
  };
}

module.exports = {
  checkMysql,
  checkRedis,
  getHealthStatus,
};
