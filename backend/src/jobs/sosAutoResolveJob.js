'use strict';

const cron = require('node-cron');
const redisKeys = require('../config/redisKeys');
const sosService = require('../services/sosService');
const sosQueueService = require('../services/sosQueueService');
const logger = require('../utils/logger');

const CRON_EXPRESSION = process.env.SOS_AUTO_RESOLVE_CRON || '*/1 * * * *';
const TIMEOUT_MINUTES = parseInt(process.env.SOS_AUTO_RESOLVE_TIMEOUT_MINUTES || '30', 10);
const LOCK_KEY = process.env.SOS_AUTO_RESOLVE_LOCK_KEY || redisKeys.sosWorkerLock();
const LOCK_TTL_MS = parseInt(process.env.SOS_AUTO_RESOLVE_LOCK_TTL_MS || '45000', 10);

let cronTask = null;

async function runAutoResolveOnce() {
  const token = await sosQueueService.acquireLock(LOCK_KEY, LOCK_TTL_MS);
  if (!token) {
    logger.info('sosAutoResolveJob', 'run_skipped_locked');
    return { resolved_count: 0, skipped: true };
  }

  try {
    const result = await sosService.autoResolveTimeoutEvents(TIMEOUT_MINUTES);
    logger.info('sosAutoResolveJob', 'run_completed', {
      timeoutMinutes: TIMEOUT_MINUTES,
      resolvedCount: result.resolved_count,
    });
    return result;
  } catch (err) {
    logger.error('sosAutoResolveJob', 'run_failed', { message: err.message });
    throw err;
  } finally {
    await sosQueueService.releaseLock(LOCK_KEY, token);
  }
}

function startAutoResolveJob() {
  if (cronTask) {
    return cronTask;
  }

  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`SOS auto resolve cron expression is invalid: ${CRON_EXPRESSION}`);
  }

  cronTask = cron.schedule(CRON_EXPRESSION, () => {
    runAutoResolveOnce().catch((err) => {
      logger.error('sosAutoResolveJob', 'schedule_failed', { message: err.message });
    });
  });

  logger.info('sosAutoResolveJob', 'started', { schedule: CRON_EXPRESSION });
  return cronTask;
}

function stopAutoResolveJob() {
  if (!cronTask) {
    return;
  }

  cronTask.stop();
  cronTask = null;
  logger.info('sosAutoResolveJob', 'stopped');
}

module.exports = {
  runAutoResolveOnce,
  startAutoResolveJob,
  stopAutoResolveJob,
};
