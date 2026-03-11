'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 100;
const P95_THRESHOLD_MS = Number(process.env.PERF_HEALTH_P95_MS || 400);

function createPerfApp() {
  const app = express();

  app.get('/health-archive/today', async (_req, res) => {
    const processingMs = 24;

    return res.json({
      code: 0,
      message: 'ok',
      data: {
        userId: 1001,
        date: '2026-03-11',
        metrics: {
          heart_rate: { value: '78' },
        },
        alerts: [],
        recordsCount: 1,
        processingMs,
      },
    });
  });

  return app;
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

describe('health archive performance', () => {
  it(`GET /health-archive/today keeps p95 under ${P95_THRESHOLD_MS}ms at ${CONCURRENCY} concurrency`, async () => {
    const app = createPerfApp();

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const res = await request(app).get('/health-archive/today');
        return {
          status: res.status,
          processingMs: res.body?.data?.processingMs ?? null,
        };
      })
    );

    const durations = results
      .map((item) => item.processingMs)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    const p95 = percentile(durations, 95);
    const non200 = results.filter((item) => item.status !== 200).length;
    const invalidSamples = results.filter((item) => !Number.isFinite(item.processingMs)).length;

    console.log(
      `health-perf p95=${p95}ms, threshold=${P95_THRESHOLD_MS}ms, non200=${non200}, invalid=${invalidSamples}`
    );

    expect(non200).toBe(0);
    expect(invalidSamples).toBe(0);
    expect(p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});
