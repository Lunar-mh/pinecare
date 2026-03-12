'use strict';

jest.mock('../../src/services/systemHealthService', () => ({
  getLivenessStatus: jest.fn(() => ({ status: 'ok', runtimeMode: 'stub-ready' })),
  getReadinessStatus: jest.fn(async () => ({
    ready: true,
    data: { status: 'ok', mysql: { status: 'ok' }, redis: { status: 'ok' } },
  })),
}));

const express = require('express');
const request = require('supertest');
const systemHealthRoutes = require('../../src/routes/systemHealthRoutes');
const {
  summarizeSamples,
  recordPerformanceBaseline,
  printPerformanceBaseline,
} = require('./shared');

const CONCURRENCY = 120;
const P95_THRESHOLD_MS = Number(process.env.PERF_SYSTEM_PROBES_P95_MS || 250);

function createApp() {
  const app = express();
  app.use(systemHealthRoutes);
  return app;
}

describe('system probe performance', () => {
  it(`GET /livez and /readyz keep p95 under ${P95_THRESHOLD_MS}ms`, async () => {
    const app = createApp();

    const livezResults = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const startedAt = Date.now();
        const res = await request(app).get('/livez');
        return { status: res.status, duration: Date.now() - startedAt };
      })
    );

    const readyzResults = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const startedAt = Date.now();
        const res = await request(app).get('/readyz');
        return { status: res.status, duration: Date.now() - startedAt };
      })
    );

    const livezMetrics = summarizeSamples(livezResults.map((item) => item.duration));
    const readyzMetrics = summarizeSamples(readyzResults.map((item) => item.duration));

    printPerformanceBaseline(
      recordPerformanceBaseline('system-livez', livezMetrics, {
        endpoint: 'GET /livez',
        concurrency: CONCURRENCY,
        sqlCount: 0,
        redisHits: 0,
        fallbackTriggered: false,
      })
    );

    printPerformanceBaseline(
      recordPerformanceBaseline('system-readyz', readyzMetrics, {
        endpoint: 'GET /readyz',
        concurrency: CONCURRENCY,
        sqlCount: 1,
        redisHits: 1,
        fallbackTriggered: false,
      })
    );

    expect(livezResults.every((item) => item.status === 200)).toBe(true);
    expect(readyzResults.every((item) => item.status === 200)).toBe(true);
    expect(livezMetrics.p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
    expect(readyzMetrics.p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});
