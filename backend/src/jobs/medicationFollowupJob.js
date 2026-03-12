'use strict';

const cron = require('node-cron');
const medicationLogModel = require('../models/medicationLogModel');
const medicationPlanModel = require('../models/medicationPlanModel');
const reminderPolicyService = require('../services/reminderPolicyService');
const reminderNotificationService = require('../services/reminderNotificationService');
const familyNotificationService = require('../services/familyNotificationService');
const logger = require('../utils/logger');

let cronTask = null;

function makePlanFallback(log) {
  return {
    id: log.plan_id,
    user_id: log.user_id,
    medication_name: log.medication_name || 'Medication reminder',
    dosage: log.dosage || '',
  };
}

async function loadPlan(log) {
  return (await medicationPlanModel.getById(log.plan_id)) || makePlanFallback(log);
}

async function processSecondReminder(log, current) {
  try {
    const policy = await reminderPolicyService.checkUserReminderPermission(log.user_id, current);
    if (!policy.allowed) {
      return 'skipped';
    }

    const plan = await loadPlan(log);
    const result = await reminderNotificationService.sendSecondReminder(plan, log);
    return result && result.success ? 'sent' : 'failed';
  } catch (error) {
    logger.error('medicationFollowupJob', 'second_reminder_failed', {
      logId: log.id || null,
      planId: log.plan_id || null,
      userId: log.user_id || null,
      message: error.message,
    });
    return 'failed';
  }
}

async function processMissedLog(log) {
  let marked = false;

  try {
    const changed = await medicationLogModel.markMissed(log.id);
    if (changed === 0) {
      return { marked: false, notified: false, failed: false };
    }

    marked = true;
    const plan = await loadPlan(log);
    const familyResult = await familyNotificationService.notifyMissedMedication(log, plan);

    if (familyResult && familyResult.success && !familyResult.skipped) {
      return { marked: true, notified: true, failed: false };
    }

    return { marked: true, notified: false, failed: Boolean(!familyResult || !familyResult.success) };
  } catch (error) {
    logger.error('medicationFollowupJob', 'missed_followup_failed', {
      logId: log.id || null,
      planId: log.plan_id || null,
      userId: log.user_id || null,
      message: error.message,
    });
    return { marked, notified: false, failed: true };
  }
}

async function runOnce(now) {
  const current = now instanceof Date ? now : new Date(now || Date.now());

  const secondCandidates = await medicationLogModel.listPendingForSecondReminder(current, 30);
  let secondSent = 0;
  let secondSkipped = 0;
  let secondFailed = 0;

  for (const log of secondCandidates) {
    const status = await processSecondReminder(log, current);
    if (status === 'sent') {
      secondSent += 1;
    } else if (status === 'skipped') {
      secondSkipped += 1;
    } else {
      secondFailed += 1;
    }
  }

  const missedCandidates = await medicationLogModel.listPendingForMissed(current, 2);
  let markedMissed = 0;
  let familyNotified = 0;
  let familyFailed = 0;

  for (const log of missedCandidates) {
    const result = await processMissedLog(log);
    if (result.marked) {
      markedMissed += 1;
    }
    if (result.notified) {
      familyNotified += 1;
    }
    if (result.failed) {
      familyFailed += 1;
    }
  }

  return {
    trigger_time: current,
    second_total: secondCandidates.length,
    second_sent: secondSent,
    second_skipped: secondSkipped,
    second_failed: secondFailed,
    missed_total: missedCandidates.length,
    marked_missed: markedMissed,
    family_notified: familyNotified,
    family_failed: familyFailed,
  };
}

function start() {
  if (cronTask) {
    return cronTask;
  }

  cronTask = cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await runOnce(new Date());
      logger.info('medicationFollowupJob', 'run_completed', result);
    } catch (error) {
      logger.error('medicationFollowupJob', 'run_failed', { message: error.message });
    }
  });

  logger.info('medicationFollowupJob', 'started', { schedule: '*/5 * * * *' });
  return cronTask;
}

function stop() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('medicationFollowupJob', 'stopped');
  }
}

module.exports = {
  start,
  stop,
  runOnce,
};
