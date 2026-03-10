'use strict';

/**
 * AI 陪伴接口性能测试 (T043)
 * 目标: POST /ai-companion/companion/chat 在 50 并发下 p95 < 5s
 *
 * 运行方式:
 *   TEST_BASE_URL=http://localhost:3000 TEST_JWT_TOKEN=<token> npx jest tests/performance/companion.perf.test.js --testTimeout=120000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 50;
const P95_THRESHOLD_MS = 5000;
const REQUEST_BODY = JSON.stringify({ message: '今天有点想家，想聊聊过去的故事。' });

function sendRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL('/ai-companion/companion/chat', BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(REQUEST_BODY),
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
      timeout: P95_THRESHOLD_MS + 2000,
    };

    const req = lib.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, durationMs: Date.now() - start });
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 0, durationMs: Date.now() - start, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 0, durationMs: Date.now() - start, error: 'request timeout' });
    });

    req.write(REQUEST_BODY);
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

describe('AI 陪伴接口性能测试', () => {
  jest.setTimeout(120000);

  it(`POST /ai-companion/companion/chat - ${CONCURRENCY} 并发，p95 < ${P95_THRESHOLD_MS / 1000}s`, async () => {
    console.log(`\n开始性能测试: ${CONCURRENCY} 并发 -> ${BASE_URL}/ai-companion/companion/chat`);

    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));
    const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
    const errors = results.filter((item) => item.error);
    const non2xx = results.filter(
      (item) => item.statusCode !== 0 && (item.statusCode < 200 || item.statusCode >= 300)
    );

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const p99 = percentile(durations, 99);
    const avg = Math.round(durations.reduce((sum, cur) => sum + cur, 0) / durations.length);
    const minDur = durations[0];
    const maxDur = durations[durations.length - 1];

    console.log('\n-- 性能统计 ------------------------------');
    console.log(`  并发数   : ${CONCURRENCY}`);
    console.log(`  成功数   : ${CONCURRENCY - errors.length}`);
    console.log(`  错误数   : ${errors.length}`);
    console.log(`  非2xx数  : ${non2xx.length}`);
    console.log(`  最小耗时 : ${minDur}ms`);
    console.log(`  平均耗时 : ${avg}ms`);
    console.log(`  p50      : ${p50}ms`);
    console.log(`  p95      : ${p95}ms  (阈值: ${P95_THRESHOLD_MS}ms)`);
    console.log(`  p99      : ${p99}ms`);
    console.log(`  最大耗时 : ${maxDur}ms`);
    if (errors.length > 0) {
      console.log(`  错误样例 : ${errors.slice(0, 3).map((item) => item.error).join(', ')}`);
    }
    console.log('-----------------------------------------\n');

    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
