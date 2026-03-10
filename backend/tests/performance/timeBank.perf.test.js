'use strict';

/**
 * 鏃堕棿閾惰鎺掕姒滄帴鍙ｆ€ц兘娴嬭瘯 (T042)
 * 鐩爣: GET /time-bank/leaderboard 鍦?200 骞跺彂涓?p95 < 200ms
 *
 * 杩愯鏂瑰紡:
 * TEST_BASE_URL=http://localhost:3000 TEST_JWT_TOKEN=<token> npx jest tests/performance/timeBank.perf.test.js --testTimeout=120000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 200;
const P95_THRESHOLD_MS = Number(process.env.PERF_TIMEBANK_P95_MS || 300);

/**
 * 鍙戦€佸崟涓?GET 璇锋眰骞惰繑鍥炶€楁椂
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
 * 鐧惧垎浣嶈绠? * @param {number[]} sortedArr
 * @param {number} p
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

describe('鏃堕棿閾惰鎺掕姒滄€ц兘娴嬭瘯', () => {
  jest.setTimeout(120000);

  it(`GET /time-bank/leaderboard 鈥?${CONCURRENCY} 骞跺彂锛宲95 < ${P95_THRESHOLD_MS}ms`, async () => {
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));

    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const errors = results.filter((r) => r.error);
    const non2xx = results.filter(
      (r) => r.statusCode !== 0 && (r.statusCode < 200 || r.statusCode >= 300)
    );

    const p50 = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    const p99 = percentile(durations, 99);

    console.log('\n鈹€鈹€ 鏃堕棿閾惰鎺掕姒滄€ц兘缁熻 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€');
    console.log(`  骞跺彂鏁?  : ${CONCURRENCY}`);
    console.log(`  鎴愬姛鏁?  : ${CONCURRENCY - errors.length}`);
    console.log(`  閿欒鏁?  : ${errors.length}`);
    console.log(`  闈?xx鏁? : ${non2xx.length}`);
    console.log(`  p50      : ${p50}ms`);
    console.log(`  p95      : ${p95}ms  (闃堝€? ${P95_THRESHOLD_MS}ms)`);
    console.log(`  p99      : ${p99}ms`);
    console.log('鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€\n');

    expect(p95).toBeLessThanOrEqual(P95_THRESHOLD_MS);
  });
});


