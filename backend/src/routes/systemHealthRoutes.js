'use strict';

const express = require('express');
const systemHealthService = require('../services/systemHealthService');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.get('/livez', (_req, res) => {
  return ok(res, systemHealthService.getLivenessStatus(), 'Liveness check passed.');
});

router.get('/readyz', async (_req, res) => {
  try {
    const result = await systemHealthService.getReadinessStatus();
    if (!result.ready) {
      return fail(res, 503, 'Readiness check failed.', result.data, 503);
    }

    return ok(res, result.data, 'Readiness check passed.');
  } catch (err) {
    return fail(
      res,
      500,
      'Readiness check execution failed.',
      { status: 'error', detail: err.message },
      500
    );
  }
});

module.exports = router;
