'use strict';

const express = require('express');
const { query } = require('../config/database');
const redis = require('../config/redis');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let mysqlStatus = '正常';
    let redisStatus = '正常';

    try {
      await query('SELECT 1');
    } catch (err) {
      mysqlStatus = `异常: ${err.message}`;
    }

    try {
      await redis.ping();
    } catch (err) {
      redisStatus = `异常: ${err.message}`;
    }

    const allHealthy = mysqlStatus === '正常' && redisStatus === '正常';

    if (!allHealthy) {
      return fail(
        res,
        503,
        '健康检查未通过',
        {
          mysql: mysqlStatus,
          redis: redisStatus,
        },
        503
      );
    }

    return ok(
      res,
      {
        mysql: mysqlStatus,
        redis: redisStatus,
      },
      '健康检查通过'
    );
  } catch (err) {
    return fail(res, 500, '健康检查执行失败', { detail: err.message }, 500);
  }
});

module.exports = router;
