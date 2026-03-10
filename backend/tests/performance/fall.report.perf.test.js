'use strict';

/**
 * 跌倒上报接口性能测试
 * 目标: POST /fall-detection/report 在 100 并发下 p95 < 500ms
 *
 * 运行方式:
 *   TEST_BASE_URL=http://localhost:3000 TEST_JWT_TOKEN=<token> npx jest tests/performance/fall.report.perf.test.js --testTimeout=120000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 100;
const P95_THRESHOLD_MS = 500;
const REQUEST_BODY = JSON.stringify({
  sensorData: {
    verticalPeak: 3.6,
    horizontalChangeRate: 2.3,
    samples: [
      { x: 0.1, y: 0.2, z: 0.9, timestamp: 1 },
      { x: 1.2, y: 1.1, z: 3.6, timestamp: 1001 },
    ],
  },
});

/**
 * 发送单次请求
 * @returns {Promise<{statusCode:number,durationMs:number,error?:string}>}
 */
function sendRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL('/fall-detection/report', BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(REQUEST_BODY),
          Authorization: `Bearer ${JWT_TOKEN}`,
        },
        timeout: P95_THRESHOLD_MS + 1000,
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

    req.write(REQUEST_BODY);
    req.end();
  });
}

/**
 * 百分位计算
 * @param {number[]} sortedArr
 * @param {number} p
 * @returns {number}
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) {
    return 0;
  }
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

describe('跌倒上报性能测试', () => {
  jest.setTimeout(120000);

  it(`POST /fall-detection/report 在 ${CONCURRENCY} 并发下 p95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));
    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const p95 = percentile(durations, 95);

    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});
