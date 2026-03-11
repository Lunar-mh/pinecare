'use strict';

const medicationReminderJob = require('./medicationReminderJob');
const medicationFollowupJob = require('./medicationFollowupJob');
const refillReminderJob = require('./refillReminderJob');
const logger = require('../utils/logger');
const { getServerRole } = require('../config/http');

let started = false;

function isEnabled() {
  return process.env.ENABLE_MEDICATION_JOBS !== '0';
}

function getJobStatus() {
  return {
    serverRole: getServerRole(),
    enabled: isEnabled(),
    started,
    jobs: [
      { key: 'medication_reminder', running: started && isEnabled() },
      { key: 'medication_followup', running: started && isEnabled() },
      { key: 'refill_reminder', running: started && isEnabled() },
    ],
  };
}

function startMedicationJobs() {
  if (started) {
    return;
  }

  if (!isEnabled()) {
    logger.info('jobs', 'disabled_by_env');
    return;
  }

  medicationReminderJob.start();
  medicationFollowupJob.start();
  refillReminderJob.start();

  started = true;
  logger.info('jobs', 'started', { serverRole: getServerRole() });
}

function stopMedicationJobs() {
  if (!started) {
    return;
  }

  medicationReminderJob.stop();
  medicationFollowupJob.stop();
  refillReminderJob.stop();

  started = false;
  logger.info('jobs', 'stopped', { serverRole: getServerRole() });
}

module.exports = {
  startMedicationJobs,
  stopMedicationJobs,
  medicationReminderJob,
  medicationFollowupJob,
  refillReminderJob,
  getJobStatus,
};
