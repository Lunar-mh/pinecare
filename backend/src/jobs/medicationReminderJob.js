'use strict';

const cron = require('node-cron');
const reminderScheduleService = require('../services/reminderScheduleService');
const reminderPolicyService = require('../services/reminderPolicyService');
const reminderNotificationService = require('../services/reminderNotificationService');

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
      console.log(
        `[用药提醒任务] 执行完成，总数:${result.total}，发送:${result.sent}，跳过:${result.skipped}，失败:${result.failed}`
      );
    } catch (err) {
      console.error('[用药提醒任务] 执行失败:', err.message);
    }
  });

  console.log('[用药提醒任务] 已启动（每分钟执行）');
  return cronTask;
}

function stop() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[用药提醒任务] 已停止');
  }
}

module.exports = {
  start,
  stop,
  runOnce,
};
