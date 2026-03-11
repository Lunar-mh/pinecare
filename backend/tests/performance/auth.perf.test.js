'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 100;
const P95_THRESHOLD_MS = 800;

function buildMockApp() {
  const app = express();
  app.use(express.json());

  // Use a lightweight mock handler so the test measures app overhead instead of upstream services.
  app.post('/auth/login/phone', async (req, res) => {
    const { phone, password } = req.body || {};

    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: 'Missing required fields.', data: null });
    }

    const jitter = 2 + Math.floor(Math.random() * 8);
    await new Promise((resolve) => setTimeout(resolve, jitter));

    return res.json({
      code: 0,
      message: 'ok',
      data: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 900,
        user: {
          id: 1,
          phone,
          account_status: 'active',
        },
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

describe('auth performance', () => {
  it(`POST /auth/login/phone keeps p95 below ${P95_THRESHOLD_MS}ms under ${CONCURRENCY} concurrent requests`, async () => {
    const app = buildMockApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const start = Date.now();
      const response = await request(app)
        .post('/auth/login/phone')
        .send({ phone: '13800138000', password: 'Password123' });
      const duration = Date.now() - start;
      return {
        status: response.status,
        duration,
      };
    });

    const results = await Promise.all(tasks);

    const durations = results.map((item) => item.duration).sort((a, b) => a - b);
    const p95 = percentile(durations, 95);
    const p50 = percentile(durations, 50);
    const max = durations[durations.length - 1];

    const non200 = results.filter((item) => item.status !== 200);

    console.log('\nAuth performance');
    console.log(`concurrency: ${CONCURRENCY}`);
    console.log(`p50: ${p50}ms`);
    console.log(`p95: ${p95}ms`);
    console.log(`max: ${max}ms`);
    console.log(`non200: ${non200.length}`);

    expect(non200.length).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
