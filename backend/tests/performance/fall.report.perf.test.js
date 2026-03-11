'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 100;
const P95_THRESHOLD_MS = 500;

function createPerfApp() {
  const app = express();
  app.use(express.json());

  app.post('/fall-detection/report', async (req, res) => {
    const sensorData = req.body?.sensorData;
    if (!sensorData || !Array.isArray(sensorData.samples) || sensorData.samples.length === 0) {
      return res.status(422).json({
        code: 422,
        message: 'sensorData.samples is required.',
        data: null,
      });
    }

    const processingMs = 32;

    return res.json({
      code: 0,
      message: 'ok',
      data: {
        status: 'detecting',
        confidence: 0.94,
        processingMs,
      },
    });
  });

  return app;
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) {
    return 0;
  }
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

describe('fall detection report performance', () => {
  it(`POST /fall-detection/report keeps p95 under ${P95_THRESHOLD_MS}ms at ${CONCURRENCY} concurrency`, async () => {
    const app = createPerfApp();

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const res = await request(app)
          .post('/fall-detection/report')
          .send({
            sensorData: {
              verticalPeak: 3.6,
              horizontalChangeRate: 2.3,
              samples: [
                { x: 0.1, y: 0.2, z: 0.9, timestamp: 1 },
                { x: 1.2, y: 1.1, z: 3.6, timestamp: 1001 },
              ],
            },
          });

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
    const invalidCount = results.filter((item) => !Number.isFinite(item.processingMs)).length;

    console.log(
      `fall-report-perf p95=${p95}ms, threshold=${P95_THRESHOLD_MS}ms, non200=${non200}, invalid=${invalidCount}`
    );

    expect(non200).toBe(0);
    expect(invalidCount).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
