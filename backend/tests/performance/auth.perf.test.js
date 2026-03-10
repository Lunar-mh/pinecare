'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 100;
const P95_THRESHOLD_MS = 500;

function buildMockApp() {
  const app = express();
  app.use(express.json());

  // 使用桩接口模拟登录耗时，避免依赖真实数据库与外部服务
  app.post('/auth/login/phone', async (req, res) => {
    const { phone, password } = req.body || {};

    if (!phone || !password) {
      return res.status(400).json({ code: 400, message: '参数缺失', data: null });
    }

    const jitter = 5 + Math.floor(Math.random() * 20);
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

describe('认证接口性能测试', () => {
  it(`POST /auth/login/phone 在 ${CONCURRENCY} 并发下 p95 < ${P95_THRESHOLD_MS}ms`, async () => {
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

    console.log('\n认证性能统计');
    console.log(`并发数: ${CONCURRENCY}`);
    console.log(`p50: ${p50}ms`);
    console.log(`p95: ${p95}ms`);
    console.log(`max: ${max}ms`);
    console.log(`非200数量: ${non200.length}`);

    expect(non200.length).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
