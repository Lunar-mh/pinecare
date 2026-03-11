'use strict';

const medicationReminderJob = require('./medicationReminderJob');
const medicationFollowupJob = require('./medicationFollowupJob');
const refillReminderJob = require('./refillReminderJob');
const sosNotificationWorker = require('./sosNotificationWorker');
const logger = require('../utils/logger');
const { getServerRole } = require('../config/http');

let started = false;

function isMedicationJobsEnabled() {
  return process.env.ENABLE_MEDICATION_JOBS !== '0';
}

function isSosQueueWorkerEnabled() {
  return process.env.ENABLE_SOS_QUEUE_WORKER !== '0';
}

function isAnyWorkerEnabled() {
  return isMedicationJobsEnabled() || isSosQueueWorkerEnabled();
}

function getJobStatus() {
  const medicationEnabled = isMedicationJobsEnabled();
  const sosEnabled = isSosQueueWorkerEnabled();

  return {
    serverRole: getServerRole(),
    enabled: isAnyWorkerEnabled(),
    started,
    jobs: [
      { key: 'medication_reminder', enabled: medicationEnabled, running: started && medicationEnabled },
      { key: 'medication_followup', enabled: medicationEnabled, running: started && medicationEnabled },
      { key: 'refill_reminder', enabled: medicationEnabled, running: started && medicationEnabled },
      { key: 'sos_notification_queue', enabled: sosEnabled, running: started && sosEnabled },
    ],
  };
}

function startBackgroundWorkers() {
  if (started) {
    return;
  }

  if (!isAnyWorkerEnabled()) {
    logger.info('jobs', 'disabled_by_env');
    return;
  }

  if (isMedicationJobsEnabled()) {
    medicationReminderJob.start();
    medicationFollowupJob.start();
    refillReminderJob.start();
  }

  if (isSosQueueWorkerEnabled()) {
    sosNotificationWorker.startWorker();
  }

  started = true;
  logger.info('jobs', 'started', {
    serverRole: getServerRole(),
    medicationJobsEnabled: isMedicationJobsEnabled(),
    sosQueueWorkerEnabled: isSosQueueWorkerEnabled(),
  });
}

function stopBackgroundWorkers() {
  if (!started) {
    return;
  }

  medicationReminderJob.stop();
  medicationFollowupJob.stop();
  refillReminderJob.stop();
  sosNotificationWorker.stopWorker();

  started = false;
  logger.info('jobs', 'stopped', { serverRole: getServerRole() });
}

function startMedicationJobs() {
  startBackgroundWorkers();
}

function stopMedicationJobs() {
  stopBackgroundWorkers();
}

module.exports = {
  startBackgroundWorkers,
  stopBackgroundWorkers,
  startMedicationJobs,
  stopMedicationJobs,
  medicationReminderJob,
  medicationFollowupJob,
  refillReminderJob,
  sosNotificationWorker,
  getJobStatus,
};
