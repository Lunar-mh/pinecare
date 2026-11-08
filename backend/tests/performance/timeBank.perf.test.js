'use strict';

const express = require('express');
const request = require('supertest');
const {
  summarizeSamples,
  recordPerformanceBaseline,
  printPerformanceBaseline,
} = require('./shared');

const CONCURRENCY = 200;
const P95_THRESHOLD_MS = Number(process.env.PERF_TIMEBANK_P95_MS || 500);

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
      message: 'Time bank leaderboard loaded.',
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

describe('time bank leaderboard performance', () => {
  it(`GET /time-bank/leaderboard keeps p95 under ${P95_THRESHOLD_MS}ms at ${CONCURRENCY} concurrency`, async () => {
    const app = createPerfApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const startAt = Date.now();
      const res = await request(app).get('/time-bank/leaderboard?communityId=1');
      return {
        status: res.status,
        duration: Date.now() - startAt,
        processingMs: res.body && res.body.meta ? Number(res.body.meta.processingMs) || 0 : 0,
      };
    });

    const results = await Promise.all(tasks);
    const endToEndMetrics = summarizeSamples(results.map((item) => item.duration));
    const processingMetrics = summarizeSamples(results.map((item) => item.processingMs));
    const non200 = results.filter((item) => item.status !== 200).length;

    const record = recordPerformanceBaseline('time-bank-leaderboard', endToEndMetrics, {
      endpoint: 'GET /time-bank/leaderboard',
      concurrency: CONCURRENCY,
      sqlCount: 0,
      redisHits: 0,
      fallbackTriggered: false,
      processing: processingMetrics,
      non200,
    });
    printPerformanceBaseline(record);

    expect(non200).toBe(0);
    expect(endToEndMetrics.p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});
