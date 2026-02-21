'use strict';

/**
 * AI 咨询接口性能测试 (T029)
 * 目标: POST /ai-consult/chat 在 50 并发下 p95 < 5s
 *
 * 运行方式:
 *   TEST_BASE_URL=http://localhost:3000 TEST_JWT_TOKEN=<token> npx jest tests/performance/aiConsult.perf.test.js --testTimeout=120000
 *
 * 环境变量:
 *   TEST_BASE_URL   — 服务地址（默认 http://localhost:3000）
 *   TEST_JWT_TOKEN  — 有效 JWT token（默认使用 mock 模式）
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ─── 配置 ─────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 50;
const P95_THRESHOLD_MS = 5000;
const REQUEST_BODY = JSON.stringify({ message: '我最近血压偏高，有什么注意事项？', sessionId: 'perf-test' });

// ─── HTTP 请求工具 ────────────────────────────────────────────────────────────

/**
 * 发送单个 HTTP 请求并返回耗时（ms）
 * @returns {Promise<{ statusCode: number, durationMs: number, error?: string }>}
 */
function sendRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL('/ai-consult/chat', BASE_URL);
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
      timeout: P95_THRESHOLD_MS + 2000, // 比阈值多2秒的套接字超时
    };

    const req = lib.request(options, (res) => {
      // 消费响应体（必须，否则连接不会释放）
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

// ─── 统计工具 ─────────────────────────────────────────────────────────────────

/**
 * 计算百分位数
 * @param {number[]} sortedArr
 * @param {number} percentile 0-100
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

// ─── 测试套件 ─────────────────────────────────────────────────────────────────

describe('AI 咨询接口性能测试', () => {
  jest.setTimeout(120000); // 120 秒总超时

  it(`POST /ai-consult/chat — ${CONCURRENCY} 并发，p95 < ${P95_THRESHOLD_MS / 1000}s`, async () => {
    console.log(`\n开始性能测试: ${CONCURRENCY} 并发 → ${BASE_URL}/ai-consult/chat`);

    // 发起全部并发请求
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => sendRequest())
    );

    // 统计分析
    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const errors = results.filter((r) => r.error);
    const non2xx = results.filter((r) => r.statusCode !== 0 && (r.statusCode < 200 || r.statusCode >= 300));

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const p99 = percentile(durations, 99);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const minDur = durations[0];
    const maxDur = durations[durations.length - 1];

    console.log('\n── 性能统计 ───────────────────────────────');
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
      console.log(`  错误样例 : ${errors.slice(0, 3).map((e) => e.error).join(', ')}`);
    }
    console.log('────────────────────────────────────────────\n');

    // 断言：p95 必须 < 5s
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
