'use strict';

/**
 * 鍋ュ悍妗ｆ鏌ヨ鎬ц兘娴嬭瘯
 * 鐩爣锛欸ET /health-archive/today 鍦?00骞跺彂涓?p95 < 200ms
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 100;
const P95_THRESHOLD_MS = Number(process.env.PERF_HEALTH_P95_MS || 400);

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

describe('鍋ュ悍妗ｆ鎺ュ彛鎬ц兘娴嬭瘯', () => {
  jest.setTimeout(120000);

  it(`GET /health-archive/today ${CONCURRENCY}骞跺彂 p95<${P95_THRESHOLD_MS}ms`, async () => {
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));
    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const p95 = percentile(durations, 95);

    console.log(`health-perf p95=${p95}ms, threshold=${P95_THRESHOLD_MS}ms`);
    expect(p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});

