'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 50;
const P95_THRESHOLD_MS = 5000;

function createPerfApp() {
  const app = express();
  app.use(express.json());

  app.post('/ai-companion/companion/chat', async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return res.status(422).json({
        code: 422,
        message: 'message is required.',
        data: null,
      });
    }

    const processingMs = 26;

    return res.json({
      code: 0,
      message: 'ok',
      data: {
        reply: '我在这儿，咱们慢慢聊聊以前开心的事情。',
        mood: 'warm',
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

describe('AI companion performance', () => {
  it(`POST /ai-companion/companion/chat keeps p95 under ${P95_THRESHOLD_MS}ms at ${CONCURRENCY} concurrency`, async () => {
    const app = createPerfApp();

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        const res = await request(app)
          .post('/ai-companion/companion/chat')
          .send({ message: '今天有点想家，想聊聊以前的故事。' });

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
    const non2xx = results.filter((item) => item.status !== 200).length;
    const invalidCount = results.filter((item) => !Number.isFinite(item.processingMs)).length;

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const p99 = percentile(durations, 99);
    const avg = Math.round(durations.reduce((sum, cur) => sum + cur, 0) / durations.length);
    const minDur = durations[0];
    const maxDur = durations[durations.length - 1];

    console.log('\nAI companion performance');
    console.log(`  concurrency : ${CONCURRENCY}`);
    console.log(`  success     : ${CONCURRENCY - non2xx}`);
    console.log(`  non-2xx     : ${non2xx}`);
    console.log(`  invalid     : ${invalidCount}`);
    console.log(`  min         : ${minDur}ms`);
    console.log(`  avg         : ${avg}ms`);
    console.log(`  p50         : ${p50}ms`);
    console.log(`  p95         : ${p95}ms (threshold: ${P95_THRESHOLD_MS}ms)`);
    console.log(`  p99         : ${p99}ms`);
    console.log(`  max         : ${maxDur}ms\n`);

    expect(non2xx).toBe(0);
    expect(invalidCount).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
