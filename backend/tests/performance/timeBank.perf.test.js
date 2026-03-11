'use strict';

/**
 * Time bank leaderboard performance test (T042)
 * Goal: GET /time-bank/leaderboard with 200 concurrent requests keeps p95 < 300ms.
 *
 * Example:
 * TEST_BASE_URL=http://localhost:3000 TEST_JWT_TOKEN=<token> npx jest tests/performance/timeBank.perf.test.js --testTimeout=120000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 200;
const P95_THRESHOLD_MS = Number(process.env.PERF_TIMEBANK_P95_MS || 300);

function sendRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL('/time-bank/leaderboard?communityId=1', BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${JWT_TOKEN}`,
        },
        timeout: P95_THRESHOLD_MS + 2000,
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
  if (sortedArr.length === 0) {
    return 0;
  }
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

describe('time bank leaderboard performance', () => {
  jest.setTimeout(120000);

  it(`GET /time-bank/leaderboard keeps p95 under ${P95_THRESHOLD_MS}ms at ${CONCURRENCY} concurrency`, async () => {
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));

    const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
    const errors = results.filter((item) => item.error);
    const non2xx = results.filter(
      (item) => item.statusCode !== 0 && (item.statusCode < 200 || item.statusCode >= 300)
    );

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const p99 = percentile(durations, 99);

    console.log('\nTime bank leaderboard performance');
    console.log(`  concurrency : ${CONCURRENCY}`);
    console.log(`  success     : ${CONCURRENCY - errors.length}`);
    console.log(`  errors      : ${errors.length}`);
    console.log(`  non-2xx     : ${non2xx.length}`);
    console.log(`  p50         : ${p50}ms`);
    console.log(`  p95         : ${p95}ms (threshold: ${P95_THRESHOLD_MS}ms)`);
    console.log(`  p99         : ${p99}ms\n`);

    expect(p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});
