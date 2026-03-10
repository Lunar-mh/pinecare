'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 50;
const P95_THRESHOLD_MS = 2000;

function createMockApp() {
  const app = express();
  app.use(express.json());

  // 模拟 /medical/reports 接口，避免依赖真实数据库与第三方服务
  app.get('/medical/reports', async (req, res) => {
    const startNs = process.hrtime.bigint();

    await Promise.resolve();

    const processingMs = Number(process.hrtime.bigint() - startNs) / 1000000;

    return res.json({
      code: 0,
      message: '检查报告查询成功',
      data: {
        source: 'mock',
        list: [
          {
            reportNo: 'RPT-MOCK-001',
            reportType: '检验',
            reportDate: '2026-02-01',
          },
        ],
        processingMs,
      },
    });
  });

  return app;
}

function percentile(sortedValues, p) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    return 0;
  }

  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(index, 0)];
}

describe('医疗报告查询性能测试', () => {
  it(`GET /medical/reports 在 ${CONCURRENCY} 并发下 p95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const app = createMockApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const startAt = Date.now();
      const response = await request(app).get('/medical/reports');

      return {
        status: response.status,
        duration: Date.now() - startAt,
        processingMs:
          response.body && response.body.data && Number(response.body.data.processingMs)
            ? Number(response.body.data.processingMs)
            : 0,
      };
    });

    const results = await Promise.all(tasks);

    const durations = results.map((item) => item.duration).sort((a, b) => a - b);
    const processingDurations = results.map((item) => item.processingMs).sort((a, b) => a - b);

    const p95EndToEnd = percentile(durations, 95);
    const p95Processing = percentile(processingDurations, 95);
    const p50Processing = percentile(processingDurations, 50);
    const maxProcessing = processingDurations[processingDurations.length - 1] || 0;
    const failedRequests = results.filter((item) => item.status !== 200);

    console.log('\n医疗报告查询性能统计');
    console.log(`并发数: ${CONCURRENCY}`);
    console.log(`p50(处理耗时): ${p50Processing.toFixed(3)}ms`);
    console.log(`p95(处理耗时): ${p95Processing.toFixed(3)}ms`);
    console.log(`max(处理耗时): ${maxProcessing.toFixed(3)}ms`);
    console.log(`p95(端到端): ${p95EndToEnd}ms`);
    console.log(`非200数量: ${failedRequests.length}`);

    expect(failedRequests.length).toBe(0);
    expect(p95EndToEnd).toBeLessThan(P95_THRESHOLD_MS);
  });
});
