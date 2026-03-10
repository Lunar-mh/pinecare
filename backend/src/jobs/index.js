'use strict';

const medicationReminderJob = require('./medicationReminderJob');
const medicationFollowupJob = require('./medicationFollowupJob');
const refillReminderJob = require('./refillReminderJob');

let started = false;

function startMedicationJobs() {
  if (started) {
    return;
  }

  if (process.env.ENABLE_MEDICATION_JOBS === '0') {
    console.log('[定时任务] 已通过环境变量禁用');
    return;
  }

  medicationReminderJob.start();
  medicationFollowupJob.start();
  refillReminderJob.start();

  started = true;
  console.log('[定时任务] 用药模块任务启动完成');
}

function stopMedicationJobs() {
  if (!started) {
    return;
  }

  medicationReminderJob.stop();
  medicationFollowupJob.stop();
  refillReminderJob.stop();

  started = false;
  console.log('[定时任务] 用药模块任务已停止');
}

module.exports = {
  startMedicationJobs,
  stopMedicationJobs,
  medicationReminderJob,
  medicationFollowupJob,
  refillReminderJob,
};
