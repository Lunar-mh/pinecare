'use strict';

const sosQueueService = require('../services/sosQueueService');
const sosNotificationService = require('../services/sosNotificationService');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = parseInt(process.env.SOS_QUEUE_POLL_INTERVAL_MS || '1000', 10);
const BATCH_SIZE = parseInt(process.env.SOS_QUEUE_BATCH_SIZE || '20', 10);

let workerTimer = null;
let workerRunning = false;

async function runOnce() {
  if (workerRunning) {
    return { processed: 0, skipped: true };
  }

  workerRunning = true;
  try {
    const tasks = await sosQueueService.dequeue(BATCH_SIZE);
    if (!tasks.length) {
      return { processed: 0 };
    }

    await Promise.all(tasks.map((task) => sosNotificationService.consumeTask(task)));
    return { processed: tasks.length };
  } catch (err) {
    logger.error('sosNotificationWorker', 'run_failed', { message: err.message });
    return { processed: 0, error: err.message };
  } finally {
    workerRunning = false;
  }
}

function startWorker() {
  if (workerTimer) {
    return workerTimer;
  }

  workerTimer = setInterval(() => {
    runOnce().catch((err) => {
      logger.error('sosNotificationWorker', 'poll_failed', { message: err.message });
    });
  }, POLL_INTERVAL_MS);

  if (typeof workerTimer.unref === 'function') {
    workerTimer.unref();
  }

  logger.info('sosNotificationWorker', 'started', {
    pollIntervalMs: POLL_INTERVAL_MS,
    batchSize: BATCH_SIZE,
  });
  return workerTimer;
}

function stopWorker() {
  if (!workerTimer) {
    return;
  }

  clearInterval(workerTimer);
  workerTimer = null;
  logger.info('sosNotificationWorker', 'stopped');
}

module.exports = {
  runOnce,
  startWorker,
  stopWorker,
};
