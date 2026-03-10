'use strict';

/**
 * 时间银行排行榜接口性能测试 (T042)
 * 目标: GET /time-bank/leaderboard 在 200 并发下 p95 < 200ms
 *
 * 运行方式:
 * TEST_BASE_URL=http://localhost:3000 TEST_JWT_TOKEN=<token> npx jest tests/performance/timeBank.perf.test.js --testTimeout=120000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 200;
const P95_THRESHOLD_MS = 200;

/**
 * 发送单个 GET 请求并返回耗时
 * @returns {Promise<{ statusCode: number, durationMs: number, error?: string }>}
 */
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

/**
 * 百分位计算
 * @param {number[]} sortedArr
 * @param {number} p
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

describe('时间银行排行榜性能测试', () => {
  jest.setTimeout(120000);

  it(`GET /time-bank/leaderboard — ${CONCURRENCY} 并发，p95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));

    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const errors = results.filter((r) => r.error);
    const non2xx = results.filter(
      (r) => r.statusCode !== 0 && (r.statusCode < 200 || r.statusCode >= 300)
    );

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const p99 = percentile(durations, 99);

    console.log('\n── 时间银行排行榜性能统计 ─────────────────────');
    console.log(`  并发数   : ${CONCURRENCY}`);
    console.log(`  成功数   : ${CONCURRENCY - errors.length}`);
    console.log(`  错误数   : ${errors.length}`);
    console.log(`  非2xx数  : ${non2xx.length}`);
    console.log(`  p50      : ${p50}ms`);
    console.log(`  p95      : ${p95}ms  (阈值: ${P95_THRESHOLD_MS}ms)`);
    console.log(`  p99      : ${p99}ms`);
    console.log('──────────────────────────────────────────────\n');

    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
