'use strict';

const express = require('express');
const systemHealthService = require('../services/systemHealthService');
const { ok, fail } = require('../utils/response');
const healthArchiveRouter = require('./healthArchive');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await systemHealthService.getHealthStatus();
    if (!result.healthy) {
      return fail(res, 503, 'Health check failed.', result.data, 503);
    }

    return ok(res, result.data, 'Health check passed.');
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

router.use('/', healthArchiveRouter);

module.exports = router;
