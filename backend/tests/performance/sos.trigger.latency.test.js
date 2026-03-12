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
const {
  summarizeSamples,
  recordPerformanceBaseline,
  printPerformanceBaseline,
} = require('./shared');

const ROUNDS = 30;
const P95_THRESHOLD_MS = Number(process.env.PERF_SOS_TRIGGER_P95_MS || 3000);

describe('SOS trigger latency', () => {
  test(`POST /sos/trigger keeps p95 under ${P95_THRESHOLD_MS}ms across ${ROUNDS} samples`, async () => {
    SosEventModel.createEvent.mockImplementation(async () => ({
      id: Math.floor(Math.random() * 100000),
      user_id: 9001,
      event_status: 'triggered',
      created_at: new Date().toISOString(),
      address: 'Rehearsal location',
      latitude: 30.1,
      longitude: 120.1,
    }));

    const samples = [];

    for (let index = 0; index < ROUNDS; index += 1) {
      const startAt = Date.now();
      const result = await sosService.triggerSos(9001, {
        latitude: 30.1,
        longitude: 120.1,
      });
      samples.push(Date.now() - startAt);
      expect(result.event_status).toBe('triggered');
    }

    const metrics = summarizeSamples(samples);
    const record = recordPerformanceBaseline('sos-trigger', metrics, {
      endpoint: 'POST /sos/trigger',
      rounds: ROUNDS,
      sqlCount: 1,
      redisHits: 0,
      fallbackTriggered: false,
    });
    printPerformanceBaseline(record);

    expect(metrics.p95).toBeLessThan(P95_THRESHOLD_MS);
  }, 120000);
});
