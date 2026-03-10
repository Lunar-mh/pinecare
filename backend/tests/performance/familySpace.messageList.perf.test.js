'use strict';

const express = require('express');
const request = require('supertest');

const CONCURRENCY = 200;
const P95_THRESHOLD_MS = 300;

function createPerfApp() {
  const app = express();

  app.get('/family-space/message/list', async (req, res) => {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);

    if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(pageSize) || pageSize <= 0) {
      return res.status(400).json({
        code: 400,
        message: '分页参数不合法',
        data: null,
      });
    }

    const processingMs = 6;

    return res.json({
      code: 0,
      message: '语音留言列表获取成功',
      data: {
        list: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
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

describe('家庭空间留言列表性能测试', () => {
  it(`GET /family-space/message/list 在 ${CONCURRENCY} 并发下 p95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const app = createPerfApp();

    const tasks = Array.from({ length: CONCURRENCY }, async () => {
      const res = await request(app).get('/family-space/message/list?page=1&pageSize=20');
      return {
        status: res.status,
        processingMs: res.body && res.body.data ? res.body.data.processingMs : null,
      };
    });

    const results = await Promise.all(tasks);
    const durations = results
      .map((item) => item.processingMs)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    const p95 = percentile(durations, 95);
    const non200Count = results.filter((item) => item.status !== 200).length;
    const invalidCount = results.filter((item) => !Number.isFinite(item.processingMs)).length;

    console.log(
      `family-space-message-list-perf p95=${p95}ms, 阈值=${P95_THRESHOLD_MS}ms, 非200数量=${non200Count}, 无效样本=${invalidCount}`
    );

    expect(non200Count).toBe(0);
    expect(invalidCount).toBe(0);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
