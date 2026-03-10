'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 100;
const P95_THRESHOLD_MS = 1000;

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 9009 };
    return next();
  };
});

jest.mock('../../src/services/drugInteractionService', () => ({
  checkInteractions: jest.fn(async () => {
    const jitter = 8 + Math.floor(Math.random() * 30);
    await new Promise((resolve) => setTimeout(resolve, jitter));

    return {
      checkBatchId: `batch_${Date.now()}`,
      highestRiskLevel: 'C',
      interactionCount: 1,
      interactions: [
        {
          id: 1,
          userId: 9009,
          drugA: '氯吡格雷',
          drugB: '奥美拉唑',
          level: 'C',
          status: 'pending',
        },
      ],
    };
  }),
}));

const router = require('../../src/routes/drugInteraction');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/drug-interaction', router);
  return app;
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(index, 0)];
}

describe('用药交互检测性能测试', () => {
  it(`POST /drug-interaction/check 在 ${CONCURRENCY} 并发下 p95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const app = buildApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const start = Date.now();
      const res = await request(app)
        .post('/drug-interaction/check')
        .set('Authorization', 'Bearer perf-token')
        .send({ drugList: ['氯吡格雷', '奥美拉唑'] });

      return {
        status: res.status,
        duration: Date.now() - start,
      };
    });

    const results = await Promise.all(tasks);
    const durations = results.map((item) => item.duration).sort((a, b) => a - b);
    const p95 = percentile(durations, 95);
    const p50 = percentile(durations, 50);
    const max = durations[durations.length - 1];

    const non200 = results.filter((item) => item.status !== 200);

    console.log('\n用药交互性能统计');
    console.log(`并发数: ${CONCURRENCY}`);
    console.log(`p50: ${p50}ms`);
    console.log(`p95: ${p95}ms`);
    console.log(`max: ${max}ms`);
    console.log(`非200数量: ${non200.length}`);

    expect(non200.length).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
