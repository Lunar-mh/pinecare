'use strict';

describe('jobs lifecycle', () => {
  const ORIGINAL_ENV = { ...process.env };

  function loadJobs() {
    jest.resetModules();

    const medicationReminderJob = { start: jest.fn(), stop: jest.fn() };
    const medicationFollowupJob = { start: jest.fn(), stop: jest.fn() };
    const refillReminderJob = { start: jest.fn(), stop: jest.fn() };
    const sosNotificationWorker = { startWorker: jest.fn(), stopWorker: jest.fn() };
    const logger = { info: jest.fn() };
    const getServerRole = jest.fn(() => 'worker');

    jest.doMock('../../src/jobs/medicationReminderJob', () => medicationReminderJob);
    jest.doMock('../../src/jobs/medicationFollowupJob', () => medicationFollowupJob);
    jest.doMock('../../src/jobs/refillReminderJob', () => refillReminderJob);
    jest.doMock('../../src/jobs/sosNotificationWorker', () => sosNotificationWorker);
    jest.doMock('../../src/utils/logger', () => logger);
    jest.doMock('../../src/config/http', () => ({ getServerRole }));

    const jobs = require('../../src/jobs');
    return {
      jobs,
      medicationReminderJob,
      medicationFollowupJob,
      refillReminderJob,
      sosNotificationWorker,
      logger,
      getServerRole,
    };
  }

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('starts medication jobs and sos queue worker together when enabled', () => {
    process.env.ENABLE_MEDICATION_JOBS = '1';
    process.env.ENABLE_SOS_QUEUE_WORKER = '1';

    const loaded = loadJobs();
    loaded.jobs.startBackgroundWorkers();

    expect(loaded.medicationReminderJob.start).toHaveBeenCalledTimes(1);
    expect(loaded.medicationFollowupJob.start).toHaveBeenCalledTimes(1);
    expect(loaded.refillReminderJob.start).toHaveBeenCalledTimes(1);
    expect(loaded.sosNotificationWorker.startWorker).toHaveBeenCalledTimes(1);
    expect(loaded.jobs.getJobStatus()).toEqual({
      serverRole: 'worker',
      enabled: true,
      started: true,
      jobs: [
        { key: 'medication_reminder', enabled: true, running: true },
        { key: 'medication_followup', enabled: true, running: true },
        { key: 'refill_reminder', enabled: true, running: true },
        { key: 'sos_notification_queue', enabled: true, running: true },
      ],
    });

    loaded.jobs.stopBackgroundWorkers();
    expect(loaded.medicationReminderJob.stop).toHaveBeenCalledTimes(1);
    expect(loaded.medicationFollowupJob.stop).toHaveBeenCalledTimes(1);
    expect(loaded.refillReminderJob.stop).toHaveBeenCalledTimes(1);
    expect(loaded.sosNotificationWorker.stopWorker).toHaveBeenCalledTimes(1);
  });

  it('supports enabling sos queue worker independently from medication jobs', () => {
    process.env.ENABLE_MEDICATION_JOBS = '0';
    process.env.ENABLE_SOS_QUEUE_WORKER = '1';

    const loaded = loadJobs();
    loaded.jobs.startBackgroundWorkers();

    expect(loaded.medicationReminderJob.start).not.toHaveBeenCalled();
    expect(loaded.sosNotificationWorker.startWorker).toHaveBeenCalledTimes(1);
    expect(loaded.jobs.getJobStatus()).toEqual({
      serverRole: 'worker',
      enabled: true,
      started: true,
      jobs: [
        { key: 'medication_reminder', enabled: false, running: false },
        { key: 'medication_followup', enabled: false, running: false },
        { key: 'refill_reminder', enabled: false, running: false },
        { key: 'sos_notification_queue', enabled: true, running: true },
      ],
    });
  });

  it('does not start any worker when all background services are disabled', () => {
    process.env.ENABLE_MEDICATION_JOBS = '0';
    process.env.ENABLE_SOS_QUEUE_WORKER = '0';

    const loaded = loadJobs();
    loaded.jobs.startBackgroundWorkers();

    expect(loaded.medicationReminderJob.start).not.toHaveBeenCalled();
    expect(loaded.sosNotificationWorker.startWorker).not.toHaveBeenCalled();
    expect(loaded.logger.info).toHaveBeenCalledWith('jobs', 'disabled_by_env');
    expect(loaded.jobs.getJobStatus()).toEqual({
      serverRole: 'worker',
      enabled: false,
      started: false,
      jobs: [
        { key: 'medication_reminder', enabled: false, running: false },
        { key: 'medication_followup', enabled: false, running: false },
        { key: 'refill_reminder', enabled: false, running: false },
        { key: 'sos_notification_queue', enabled: false, running: false },
      ],
    });
  });
});
