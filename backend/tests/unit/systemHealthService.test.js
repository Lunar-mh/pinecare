'use strict';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  ping: jest.fn(),
}));

jest.mock('../../src/config/http', () => ({
  getServerRole: jest.fn(() => 'worker'),
}));

jest.mock('../../src/config/runtimeMode', () => ({
  resolveMode: jest.fn(() => 'COMPETITION_SANDBOX'),
}));

jest.mock('../../src/utils/thirdParty', () => ({
  getRecentThirdPartyErrors: jest.fn(() => [{ code: '503', message: 'upstream failed' }]),
}));

jest.mock('../../src/jobs', () => ({
  getJobStatus: jest.fn(() => ({
    serverRole: 'worker',
    enabled: true,
    started: true,
    jobs: [
      { key: 'medication_reminder', running: true },
      { key: 'sos_notification_queue', running: true },
    ],
  })),
}));

jest.mock('../../src/services/eventTimelineService', () => ({
  getCareEventAuditDiagnostics: jest.fn(() => ({
    totalFailures: 2,
    suppressedLogs: 1,
    recentCount: 1,
    items: [{ action: 'sos.triggered', message: 'db down' }],
  })),
}));

jest.mock('../../src/services/sosQueueService', () => ({
  getQueueLength: jest.fn(() => 4),
}));

const { query } = require('../../src/config/database');
const redis = require('../../src/config/redis');
const { getJobStatus } = require('../../src/jobs');
const sosQueueService = require('../../src/services/sosQueueService');
const systemHealthService = require('../../src/services/systemHealthService');

const KEY_TABLES = [
  'users',
  'health_archives',
  'health_records',
  'family_bindings',
  'medication_plans',
  'medication_logs',
  'sos_events',
  'sos_notifications',
  'fall_events',
  'location_records',
  'service_orders',
  'time_accounts',
  'online_consultations',
  'appointments',
  'medical_reports',
  'audit_logs',
];

function mockHealthyQueries() {
  query.mockImplementation(async (sql) => {
    if (String(sql).includes('SELECT 1')) {
      return [[{ ok: 1 }]];
    }

    return [KEY_TABLES.map((table_name) => ({ table_name }))];
  });
}

describe('systemHealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports healthy when mysql, redis, key tables, queues, and worker jobs are ready', async () => {
    mockHealthyQueries();
    redis.ping.mockResolvedValueOnce('PONG');
    sosQueueService.getQueueLength.mockResolvedValueOnce(4);

    await expect(systemHealthService.getHealthStatus()).resolves.toEqual({
      healthy: true,
      data: {
        status: 'ok',
        runtimeMode: 'COMPETITION_SANDBOX',
        serverRole: 'worker',
        mysql: { status: 'ok' },
        redis: { status: 'ok' },
        keyTables: {
          status: 'ok',
          checked: KEY_TABLES,
          missing: [],
        },
        queues: {
          status: 'ok',
          sosNotification: {
            pending: 4,
          },
        },
        jobs: {
          serverRole: 'worker',
          enabled: true,
          started: true,
          jobs: [
            { key: 'medication_reminder', running: true },
            { key: 'sos_notification_queue', running: true },
          ],
        },
        thirdPartyErrors: {
          recentCount: 1,
          items: [{ code: '503', message: 'upstream failed' }],
        },
        careEventAudit: {
          totalFailures: 2,
          suppressedLogs: 1,
          recentCount: 1,
          items: [{ action: 'sos.triggered', message: 'db down' }],
        },
      },
    });
  });

  it('reports degraded status when dependencies, queues, or job readiness fail', async () => {
    query.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT 1')) {
        throw new Error('mysql down');
      }

      throw new Error('schema unavailable');
    });
    redis.ping.mockRejectedValueOnce(new Error('redis down'));
    sosQueueService.getQueueLength.mockRejectedValueOnce(new Error('queue unavailable'));
    getJobStatus.mockReturnValueOnce({
      serverRole: 'worker',
      enabled: true,
      started: false,
      jobs: [
        { key: 'medication_reminder', running: false },
        { key: 'sos_notification_queue', running: false },
      ],
    });

    await expect(systemHealthService.getHealthStatus()).resolves.toEqual({
      healthy: false,
      data: {
        status: 'degraded',
        runtimeMode: 'COMPETITION_SANDBOX',
        serverRole: 'worker',
        mysql: { status: 'error', detail: 'mysql down' },
        redis: { status: 'error', detail: 'redis down' },
        keyTables: {
          status: 'error',
          checked: KEY_TABLES,
          missing: KEY_TABLES,
          detail: 'schema unavailable',
        },
        queues: {
          status: 'error',
          sosNotification: {
            pending: null,
            detail: 'queue unavailable',
          },
        },
        jobs: {
          serverRole: 'worker',
          enabled: true,
          started: false,
          jobs: [
            { key: 'medication_reminder', running: false },
            { key: 'sos_notification_queue', running: false },
          ],
        },
        thirdPartyErrors: {
          recentCount: 1,
          items: [{ code: '503', message: 'upstream failed' }],
        },
        careEventAudit: {
          totalFailures: 2,
          suppressedLogs: 1,
          recentCount: 1,
          items: [{ action: 'sos.triggered', message: 'db down' }],
        },
      },
    });
  });

  it('returns liveness and readiness payloads with queue visibility', async () => {
    mockHealthyQueries();
    redis.ping.mockResolvedValueOnce('PONG');
    sosQueueService.getQueueLength.mockResolvedValueOnce(0);

    expect(systemHealthService.getLivenessStatus()).toEqual({
      status: 'ok',
      runtimeMode: 'COMPETITION_SANDBOX',
      serverRole: 'worker',
      jobs: {
        serverRole: 'worker',
        enabled: true,
        started: true,
        jobs: [
          { key: 'medication_reminder', running: true },
          { key: 'sos_notification_queue', running: true },
        ],
      },
    });

    await expect(systemHealthService.getReadinessStatus()).resolves.toEqual({
      ready: true,
      data: {
        status: 'ok',
        runtimeMode: 'COMPETITION_SANDBOX',
        serverRole: 'worker',
        mysql: { status: 'ok' },
        redis: { status: 'ok' },
        keyTables: {
          status: 'ok',
          checked: KEY_TABLES,
          missing: [],
        },
        queues: {
          status: 'ok',
          sosNotification: {
            pending: 0,
          },
        },
        jobs: {
          serverRole: 'worker',
          enabled: true,
          started: true,
          jobs: [
            { key: 'medication_reminder', running: true },
            { key: 'sos_notification_queue', running: true },
          ],
        },
        thirdPartyErrors: {
          recentCount: 1,
          items: [{ code: '503', message: 'upstream failed' }],
        },
        careEventAudit: {
          totalFailures: 2,
          suppressedLogs: 1,
          recentCount: 1,
          items: [{ action: 'sos.triggered', message: 'db down' }],
        },
      },
    });
  });
});

