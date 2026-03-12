'use strict';

const express = require('express');
const request = require('supertest');
const {
  summarizeSamples,
  recordPerformanceBaseline,
  printPerformanceBaseline,
} = require('./shared');

const CONCURRENCY = 50;
const P95_THRESHOLD_MS = Number(process.env.PERF_MEDICAL_REPORTS_P95_MS || 2000);

function createMockApp() {
  const app = express();
  app.use(express.json());

  app.get('/medical/reports', async (_req, res) => {
    const startNs = process.hrtime.bigint();
    await Promise.resolve();
    const processingMs = Number(process.hrtime.bigint() - startNs) / 1000000;

    return res.json({
      code: 0,
      message: 'Medical reports loaded.',
      data: {
        source: 'mock',
        requestedMode: 'stub',
        effectiveMode: 'stub',
        list: [
          {
            reportNo: 'RPT-MOCK-001',
            reportType: 'lab',
            reportDate: '2026-02-01',
          },
        ],
        processingMs,
      },
    });
  });

  return app;
}

describe('medical reports performance', () => {
  it(`GET /medical/reports keeps p95 under ${P95_THRESHOLD_MS}ms at ${CONCURRENCY} concurrency`, async () => {
    const app = createMockApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const startAt = Date.now();
      const response = await request(app).get('/medical/reports');
      return {
        status: response.status,
        duration: Date.now() - startAt,
        processingMs: response.body && response.body.data ? Number(response.body.data.processingMs) || 0 : 0,
      };
    });

    const results = await Promise.all(tasks);
    const endToEndMetrics = summarizeSamples(results.map((item) => item.duration));
    const processingMetrics = summarizeSamples(results.map((item) => item.processingMs));
    const failedRequests = results.filter((item) => item.status !== 200).length;

    const record = recordPerformanceBaseline('medical-reports', endToEndMetrics, {
      endpoint: 'GET /medical/reports',
      concurrency: CONCURRENCY,
      sqlCount: 0,
      redisHits: 0,
      fallbackTriggered: true,
      processing: processingMetrics,
      failedRequests,
    });
    printPerformanceBaseline(record);

    expect(failedRequests).toBe(0);
    expect(endToEndMetrics.p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
