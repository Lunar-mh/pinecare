'use strict';

const cron = require('node-cron');
const refillReminderService = require('../services/refillReminderService');
const logger = require('../utils/logger');

let cronTask = null;

async function runOnce(now) {
  return refillReminderService.runDaily(now);
}

function start() {
  if (cronTask) {
    return cronTask;
  }

  cronTask = cron.schedule('0 9 * * *', async () => {
    try {
      const result = await runOnce(new Date());
      logger.info('refillReminderJob', 'run_completed', result);
    } catch (err) {
      logger.error('refillReminderJob', 'run_failed', { message: err.message });
    }
  });

  logger.info('refillReminderJob', 'started', { schedule: '0 9 * * *' });
  return cronTask;
}

function stop() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('refillReminderJob', 'stopped');
  }
}

module.exports = {
  start,
  stop,
  runOnce,
};
