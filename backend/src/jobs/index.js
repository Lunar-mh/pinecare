'use strict';

const medicationReminderJob = require('./medicationReminderJob');
const medicationFollowupJob = require('./medicationFollowupJob');
const refillReminderJob = require('./refillReminderJob');
const logger = require('../utils/logger');

let started = false;

function startMedicationJobs() {
  if (started) {
    return;
  }

  if (process.env.ENABLE_MEDICATION_JOBS === '0') {
    logger.info('jobs', 'disabled_by_env');
    return;
  }

  medicationReminderJob.start();
  medicationFollowupJob.start();
  refillReminderJob.start();

  started = true;
  logger.info('jobs', 'started');
}

function stopMedicationJobs() {
  if (!started) {
    return;
  }

  medicationReminderJob.stop();
  medicationFollowupJob.stop();
  refillReminderJob.stop();

  started = false;
  logger.info('jobs', 'stopped');
}

module.exports = {
  startMedicationJobs,
  stopMedicationJobs,
  medicationReminderJob,
  medicationFollowupJob,
  refillReminderJob,
};
