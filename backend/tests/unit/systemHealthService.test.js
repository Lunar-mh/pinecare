'use strict';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  ping: jest.fn(),
}));

const { query } = require('../../src/config/database');
const redis = require('../../src/config/redis');
const systemHealthService = require('../../src/services/systemHealthService');

describe('systemHealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports healthy when mysql and redis are reachable', async () => {
    query.mockResolvedValueOnce([[{ ok: 1 }]]);
    redis.ping.mockResolvedValueOnce('PONG');

    await expect(systemHealthService.getHealthStatus()).resolves.toEqual({
      healthy: true,
      data: {
        status: 'ok',
        runtimeMode: expect.any(String),
        mysql: { status: 'ok' },
        redis: { status: 'ok' },
      },
    });
  });

  it('reports degraded status when dependencies fail', async () => {
    query.mockRejectedValueOnce(new Error('mysql down'));
    redis.ping.mockRejectedValueOnce(new Error('redis down'));

    await expect(systemHealthService.getHealthStatus()).resolves.toEqual({
      healthy: false,
      data: {
        status: 'degraded',
        runtimeMode: expect.any(String),
        mysql: { status: 'error', detail: 'mysql down' },
        redis: { status: 'error', detail: 'redis down' },
      },
    });
  });
});
