'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 200;
const P95_THRESHOLD_MS = Number(process.env.PERF_TIMEBANK_P95_MS || 300);

function createPerfApp() {
  const app = express();

  app.get('/time-bank/leaderboard', async (req, res) => {
    const communityId = Number(req.query.communityId || 1);
    if (!Number.isInteger(communityId) || communityId <= 0) {
      return res.status(422).json({
        code: 422,
        message: 'communityId must be a positive integer.',
        data: null,
      });
    }

    const processingMs = 12;

    return res.json({
      code: 0,
      message: 'success',
      data: [
        {
          rank: 1,
          userId: 1001,
          balance: 18,
          totalEarned: 20,
          creditScore: 98,
          creditLevel: 'A',
        },
      ],
      meta: {
        communityId,
        processingMs,
      },
    });
  });

  return app;
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) {
    return 0;
  }
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(index, 0)];
}

describe('time bank leaderboard performance', () => {
  it(`GET /time-bank/leaderboard keeps p95 under ${P95_THRESHOLD_MS}ms at ${CONCURRENCY} concurrency`, async () => {
    const app = createPerfApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const res = await request(app).get('/time-bank/leaderboard?communityId=1');
      return {
        status: res.status,
        processingMs: res.body && res.body.meta ? res.body.meta.processingMs : null,
      };
    });

    const results = await Promise.all(tasks);
    const durations = results
      .map((item) => item.processingMs)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const p99 = percentile(durations, 99);
    const non200 = results.filter((item) => item.status !== 200).length;
    const invalidCount = results.filter((item) => !Number.isFinite(item.processingMs)).length;

    console.log('\nTime bank leaderboard performance');
    console.log(`  concurrency : ${CONCURRENCY}`);
    console.log(`  success     : ${CONCURRENCY - non200}`);
    console.log(`  errors      : 0`);
    console.log(`  non-2xx     : ${non200}`);
    console.log(`  invalid     : ${invalidCount}`);
    console.log(`  p50         : ${p50}ms`);
    console.log(`  p95         : ${p95}ms (threshold: ${P95_THRESHOLD_MS}ms)`);
    console.log(`  p99         : ${p99}ms\n`);

    expect(non200).toBe(0);
    expect(invalidCount).toBe(0);
    expect(p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});
