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
    jobs: [{ key: 'medication_reminder', running: true }],
  })),
}));

const { query } = require('../../src/config/database');
const redis = require('../../src/config/redis');
const { getJobStatus } = require('../../src/jobs');
const systemHealthService = require('../../src/services/systemHealthService');

const KEY_TABLES = [
  'users',
  'health_records',
  'medication_logs',
  'sos_events',
  'fall_events',
  'location_records',
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

  it('reports healthy when mysql, redis, key tables, and worker jobs are ready', async () => {
    mockHealthyQueries();
    redis.ping.mockResolvedValueOnce('PONG');

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
        jobs: {
          serverRole: 'worker',
          enabled: true,
          started: true,
          jobs: [{ key: 'medication_reminder', running: true }],
        },
        thirdPartyErrors: {
          recentCount: 1,
          items: [{ code: '503', message: 'upstream failed' }],
        },
      },
    });
  });

  it('reports degraded status when dependencies or job readiness fail', async () => {
    query.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT 1')) {
        throw new Error('mysql down');
      }

      throw new Error('schema unavailable');
    });
    redis.ping.mockRejectedValueOnce(new Error('redis down'));
    getJobStatus.mockReturnValueOnce({
      serverRole: 'worker',
      enabled: true,
      started: false,
      jobs: [{ key: 'medication_reminder', running: false }],
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
        jobs: {
          serverRole: 'worker',
          enabled: true,
          started: false,
          jobs: [{ key: 'medication_reminder', running: false }],
        },
        thirdPartyErrors: {
          recentCount: 1,
          items: [{ code: '503', message: 'upstream failed' }],
        },
      },
    });
  });

  it('returns liveness and readiness payloads with job visibility', async () => {
    mockHealthyQueries();
    redis.ping.mockResolvedValueOnce('PONG');

    expect(systemHealthService.getLivenessStatus()).toEqual({
      status: 'ok',
      runtimeMode: 'COMPETITION_SANDBOX',
      serverRole: 'worker',
      jobs: {
        serverRole: 'worker',
        enabled: true,
        started: true,
        jobs: [{ key: 'medication_reminder', running: true }],
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
        jobs: {
          serverRole: 'worker',
          enabled: true,
          started: true,
          jobs: [{ key: 'medication_reminder', running: true }],
        },
        thirdPartyErrors: {
          recentCount: 1,
          items: [{ code: '503', message: 'upstream failed' }],
        },
      },
    });
  });
});
