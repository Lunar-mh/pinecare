'use strict';

const express = require('express');
const { query } = require('../config/database');
const redis = require('../config/redis');
const { ok, fail } = require('../utils/response');
const { resolveMode } = require('../config/runtimeMode');
const healthArchiveRouter = require('./healthArchive');

const router = express.Router();

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

router.get('/', async (req, res) => {
  try {
    const [mysql, redisState] = await Promise.all([checkMysql(), checkRedis()]);
    const healthy = mysql.status === 'ok' && redisState.status === 'ok';

    if (!healthy) {
      return fail(
        res,
        503,
        'Health check failed.',
        {
          status: 'degraded',
          runtimeMode: resolveMode(),
          mysql,
          redis: redisState,
        },
        503
      );
    }

    return ok(
      res,
      {
        status: 'ok',
        runtimeMode: resolveMode(),
        mysql,
        redis: redisState,
      },
      'Health check passed.'
    );
  } catch (err) {
    return fail(
      res,
      500,
      'Health check execution failed.',
      { status: 'error', detail: err.message },
      500
    );
  }
});

// Keep infra health check at /health while exposing spec-compatible health archive APIs.
router.use('/', healthArchiveRouter);

module.exports = router;
