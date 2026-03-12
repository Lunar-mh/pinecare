'use strict';

const cron = require('node-cron');
const reminderScheduleService = require('../services/reminderScheduleService');
const reminderPolicyService = require('../services/reminderPolicyService');
const reminderNotificationService = require('../services/reminderNotificationService');
const logger = require('../utils/logger');

let cronTask = null;

async function processReminderItem(item, current) {
  const plan = item.plan || {};
  const log = item.log || {};

  try {
    const policy = await reminderPolicyService.checkUserReminderPermission(plan.user_id, current);
    if (!policy.allowed) {
      return 'skipped';
    }

    const result = await reminderNotificationService.sendFirstReminder(plan, log);
    return result && result.success ? 'sent' : 'failed';
  } catch (error) {
    logger.error('medicationReminderJob', 'item_failed', {
      planId: plan.id || null,
      userId: plan.user_id || null,
      logId: log.id || null,
      message: error.message,
    });
    return 'failed';
  }
}

async function runOnce(now) {
  const current = now instanceof Date ? now : new Date(now || Date.now());
  const scheduleResult = await reminderScheduleService.collectDueReminders(current);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of scheduleResult.items) {
    const status = await processReminderItem(item, current);
    if (status === 'sent') {
      sent += 1;
    } else if (status === 'skipped') {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return {
    trigger_time: current,
    total: scheduleResult.total,
    sent,
    skipped,
    failed,
  };
}

function start() {
  if (cronTask) {
    return cronTask;
  }

  cronTask = cron.schedule('* * * * *', async () => {
    try {
      const result = await runOnce(new Date());
      logger.info('medicationReminderJob', 'run_completed', result);
    } catch (error) {
      logger.error('medicationReminderJob', 'run_failed', { message: error.message });
    }
  });

  logger.info('medicationReminderJob', 'started', { schedule: '* * * * *' });
  return cronTask;
}

function stop() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('medicationReminderJob', 'stopped');
  }
}

module.exports = {
  start,
  stop,
  runOnce,
};
