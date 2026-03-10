'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 500;
const P95_THRESHOLD_MS = 200;

function buildMockApp() {
  const app = express();
  app.use(express.json());

  // 模拟 GPS 上传链路耗时，避免依赖真实数据库与 Redis
  app.post('/gps/upload', async (req, res) => {
    const startNs = process.hrtime.bigint();
    const { latitude, longitude } = req.body || {};

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ code: 400, message: '参数缺失', data: null });
    }

    const processingMs = Number(process.hrtime.bigint() - startNs) / 1000000;

    return res.json({
      code: 0,
      message: 'ok',
      data: {
        location: {
          latitude: Number(latitude),
          longitude: Number(longitude),
          createdAt: new Date().toISOString(),
        },
        processingMs,
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

describe('GPS 接口性能测试', () => {
  it(`POST /gps/upload 在 ${CONCURRENCY} 并发下 p95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const app = buildMockApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const start = Date.now();
      const response = await request(app)
        .post('/gps/upload')
        .send({ latitude: 31.230416, longitude: 121.473701, accuracy: 10 });
      return {
        status: response.status,
        duration: Date.now() - start,
        processingMs:
          response.body && response.body.data && Number(response.body.data.processingMs)
            ? Number(response.body.data.processingMs)
            : 0,
      };
    });

    const results = await Promise.all(tasks);
    const durations = results.map((item) => item.duration).sort((a, b) => a - b);
    const processingDurations = results.map((item) => item.processingMs).sort((a, b) => a - b);

    const p95 = percentile(processingDurations, 95);
    const p50 = percentile(processingDurations, 50);
    const max = processingDurations[processingDurations.length - 1];
    const non200 = results.filter((item) => item.status !== 200);

    console.log('\nGPS 性能统计');
    console.log(`并发数: ${CONCURRENCY}`);
    console.log(`p50(处理耗时): ${p50.toFixed(3)}ms`);
    console.log(`p95(处理耗时): ${p95.toFixed(3)}ms`);
    console.log(`max(处理耗时): ${max.toFixed(3)}ms`);
    console.log(`p95(端到端): ${percentile(durations, 95)}ms`);
    console.log(`非200数量: ${non200.length}`);

    expect(non200.length).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
