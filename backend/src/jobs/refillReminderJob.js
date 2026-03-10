'use strict';

const cron = require('node-cron');
const refillReminderService = require('../services/refillReminderService');

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
      console.log(
        `[续药提醒任务] 日期:${result.date}，总数:${result.total}，发送:${result.sent}，跳过:${result.skipped}，失败:${result.failed}`
      );
    } catch (err) {
      console.error('[续药提醒任务] 执行失败:', err.message);
    }
  });

  console.log('[续药提醒任务] 已启动（每日09:00执行）');
  return cronTask;
}

function stop() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[续药提醒任务] 已停止');
  }
}

module.exports = {
  start,
  stop,
  runOnce,
};
