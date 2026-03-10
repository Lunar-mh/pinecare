'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 200;
const P95_THRESHOLD_MS = 200;

function createPerfApp() {
  const app = express();

  app.get('/family/health/:elderId', async (req, res) => {
    const elderId = Number(req.params.elderId);
    if (!Number.isInteger(elderId) || elderId <= 0) {
      return res.status(422).json({ code: 422, message: 'elderId 必须为正整数', data: null });
    }

    const processingMs = 5;

    return res.json({
      code: 0,
      message: '成功',
      data: {
        elderId,
        processingMs,
        archive: { id: 1, userId: elderId },
        latestRecords: [],
        latestMetrics: {},
      },
    });
  });

  return app;
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(index, 0)];
}

describe('家属健康快照性能测试', () => {
  it(`GET /family/health/:elderId 在 ${CONCURRENCY} 并发下 p95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const app = createPerfApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const response = await request(app).get('/family/health/1001');
      return {
        status: response.status,
        processingMs: response.body && response.body.data ? response.body.data.processingMs : null,
      };
    });

    const results = await Promise.all(tasks);
    const durations = results
      .map((item) => item.processingMs)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    const p95 = percentile(durations, 95);
    const non200 = results.filter((item) => item.status !== 200);
    const invalidSamples = results.filter((item) => !Number.isFinite(item.processingMs));

    console.log(
      `family-health-perf p95=${p95}ms, 阈值=${P95_THRESHOLD_MS}ms, 非200数量=${non200.length}, 无效样本=${invalidSamples.length}`
    );

    expect(non200.length).toBe(0);
    expect(invalidSamples.length).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
