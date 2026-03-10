'use strict';

/**
 * 健康档案查询性能测试
 * 目标：GET /health-archive/today 在100并发下 p95 < 200ms
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 100;
const P95_THRESHOLD_MS = 200;

function sendRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL('/health-archive/today', BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${JWT_TOKEN}`,
        },
        timeout: 3000,
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, durationMs: Date.now() - start });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ statusCode: 0, durationMs: Date.now() - start, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 0, durationMs: Date.now() - start, error: 'request timeout' });
    });

    req.end();
  });
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

describe('健康档案接口性能测试', () => {
  jest.setTimeout(120000);

  it(`GET /health-archive/today ${CONCURRENCY}并发 p95<${P95_THRESHOLD_MS}ms`, async () => {
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));
    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const p95 = percentile(durations, 95);

    console.log(`health-perf p95=${p95}ms, threshold=${P95_THRESHOLD_MS}ms`);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
