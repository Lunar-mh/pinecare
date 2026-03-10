'use strict';

const cron = require('node-cron');
const medicationLogModel = require('../models/medicationLogModel');
const medicationPlanModel = require('../models/medicationPlanModel');
const reminderPolicyService = require('../services/reminderPolicyService');
const reminderNotificationService = require('../services/reminderNotificationService');
const familyNotificationService = require('../services/familyNotificationService');

let cronTask = null;

function makePlanFallback(log) {
  return {
    id: log.plan_id,
    user_id: log.user_id,
    medication_name: log.medication_name || '用药提醒',
    dosage: log.dosage || '',
  };
}

async function runOnce(now) {
  const current = now instanceof Date ? now : new Date(now || Date.now());

  const secondCandidates = await medicationLogModel.listPendingForSecondReminder(current, 30);
  let secondSent = 0;
  let secondSkipped = 0;
  let secondFailed = 0;

  for (const log of secondCandidates) {
    const policy = await reminderPolicyService.checkUserReminderPermission(log.user_id, current);
    if (!policy.allowed) {
      secondSkipped += 1;
      continue;
    }

    const plan = (await medicationPlanModel.getById(log.plan_id)) || makePlanFallback(log);
    const result = await reminderNotificationService.sendSecondReminder(plan, log);

    if (result.success) {
      secondSent += 1;
    } else {
      secondFailed += 1;
    }
  }

  const missedCandidates = await medicationLogModel.listPendingForMissed(current, 2);
  let markedMissed = 0;
  let familyNotified = 0;

  for (const log of missedCandidates) {
    const changed = await medicationLogModel.markMissed(log.id);
    if (changed === 0) {
      continue;
    }

    markedMissed += 1;

    const plan = (await medicationPlanModel.getById(log.plan_id)) || makePlanFallback(log);
    const familyResult = await familyNotificationService.notifyMissedMedication(log, plan);
    if (familyResult.success && !familyResult.skipped) {
      familyNotified += 1;
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
  };
}

function start() {
  if (cronTask) {
    return cronTask;
  }

  cronTask = cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await runOnce(new Date());
      console.log(
        `[用药跟进任务] 二次提醒:${result.second_sent}/${result.second_total}，转missed:${result.marked_missed}，家属通知:${result.family_notified}`
      );
    } catch (err) {
      console.error('[用药跟进任务] 执行失败:', err.message);
    }
  });

  console.log('[用药跟进任务] 已启动（每5分钟执行）');
  return cronTask;
}

function stop() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[用药跟进任务] 已停止');
  }
}

module.exports = {
  start,
  stop,
  runOnce,
};
