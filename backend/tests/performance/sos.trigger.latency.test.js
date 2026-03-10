'use strict';

jest.mock('../../src/models/sosEvent', () => ({
  createEvent: jest.fn(),
  findByIdAndUser: jest.fn(),
  transitionStatus: jest.fn(),
  countByUser: jest.fn(),
  listByUser: jest.fn(),
  autoResolveTimeoutEvents: jest.fn(),
}));

jest.mock('../../src/models/sosNotification', () => ({
  summarizeByEventIds: jest.fn(),
}));

jest.mock('../../src/services/sosNotificationService', () => ({
  createAndDispatch: jest.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { queued: 2 };
  }),
}));

const SosEventModel = require('../../src/models/sosEvent');
const sosService = require('../../src/services/sosService');

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

describe('SOS 触发性能测试', () => {
  test('POST /sos/trigger 服务端 p95 应小于 3 秒', async () => {
    SosEventModel.createEvent.mockImplementation(async (_payload) => ({
      id: Math.floor(Math.random() * 100000),
      user_id: 9001,
      event_status: 'triggered',
      created_at: new Date().toISOString(),
      address: '测试地址',
      latitude: 30.1,
      longitude: 120.1,
    }));

    const samples = [];
    const rounds = 30;

    for (let i = 0; i < rounds; i += 1) {
      const start = Date.now();
      const result = await sosService.triggerSos(9001, {
        latitude: 30.1,
        longitude: 120.1,
      });
      const cost = Date.now() - start;
      samples.push(cost);

      expect(result.event_status).toBe('triggered');
    }

    const p95 = percentile(samples, 95);
    expect(p95).toBeLessThan(3000);
  }, 120000);
});
