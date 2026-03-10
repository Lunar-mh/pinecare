'use strict';

const cron = require('node-cron');
const sosService = require('../services/sosService');
const sosQueueService = require('../services/sosQueueService');

const CRON_EXPRESSION = process.env.SOS_AUTO_RESOLVE_CRON || '*/1 * * * *';
const TIMEOUT_MINUTES = parseInt(process.env.SOS_AUTO_RESOLVE_TIMEOUT_MINUTES || '30', 10);
const LOCK_KEY = process.env.SOS_AUTO_RESOLVE_LOCK_KEY || 'lock:sos:auto-resolve';
const LOCK_TTL_MS = parseInt(process.env.SOS_AUTO_RESOLVE_LOCK_TTL_MS || '45000', 10);

let cronTask = null;

async function runAutoResolveOnce() {
  const token = await sosQueueService.acquireLock(LOCK_KEY, LOCK_TTL_MS);
  if (!token) {
    console.log('SOS 自动解决任务跳过：已有实例在执行');
    return { resolved_count: 0, skipped: true };
  }

  try {
    const result = await sosService.autoResolveTimeoutEvents(TIMEOUT_MINUTES);
    console.log(`SOS 自动解决任务完成，本次处理 ${result.resolved_count} 条`);
    return result;
  } catch (err) {
    console.error('SOS 自动解决任务失败:', err.message);
    throw err;
  } finally {
    await sosQueueService.releaseLock(LOCK_KEY, token);
  }
}

function startAutoResolveJob() {
  if (cronTask) {
    return;
  }

  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`SOS 自动解决 cron 表达式非法: ${CRON_EXPRESSION}`);
  }

  cronTask = cron.schedule(CRON_EXPRESSION, () => {
    runAutoResolveOnce().catch((err) => {
      console.error('SOS 自动解决调度执行失败:', err.message);
    });
  });

  console.log(`SOS 自动解决任务已启动: ${CRON_EXPRESSION}`);
}

function stopAutoResolveJob() {
  if (!cronTask) {
    return;
  }

  cronTask.stop();
  cronTask = null;
  console.log('SOS 自动解决任务已停止');
}

module.exports = {
  runAutoResolveOnce,
  startAutoResolveJob,
  stopAutoResolveJob,
};
