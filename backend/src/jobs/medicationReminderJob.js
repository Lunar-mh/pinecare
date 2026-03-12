'use strict';

const cron = require('node-cron');
const reminderScheduleService = require('../services/reminderScheduleService');
const reminderPolicyService = require('../services/reminderPolicyService');
const reminderNotificationService = require('../services/reminderNotificationService');
const logger = require('../utils/logger');

let cronTask = null;

async function runOnce(now) {
  const current = now instanceof Date ? now : new Date(now || Date.now());
  const scheduleResult = await reminderScheduleService.collectDueReminders(current);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of scheduleResult.items) {
    const policy = await reminderPolicyService.checkUserReminderPermission(item.plan.user_id, current);
    if (!policy.allowed) {
      skipped += 1;
      continue;
    }

    const result = await reminderNotificationService.sendFirstReminder(item.plan, item.log);
    if (result.success) {
      sent += 1;
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
    } catch (err) {
      logger.error('medicationReminderJob', 'run_failed', { message: err.message });
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
