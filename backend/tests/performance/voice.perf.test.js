'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token-placeholder';
const CONCURRENCY = 50;
const P95_THRESHOLD_MS = 2000;
const REQUEST_BODY = JSON.stringify({
  audio: 'UklGRnRlc3Q=',
});

function sendRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL('/voice/recognize', BASE_URL);
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

describe('璇煶璇嗗埆鎺ュ彛鎬ц兘娴嬭瘯', () => {
  jest.setTimeout(120000);

  it(`POST /voice/recognize 鍦?${CONCURRENCY} 骞跺彂涓?p95 < 2s`, async () => {
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => sendRequest()));

    const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
    const p95 = percentile(durations, 95);

    console.log(`璇煶璇嗗埆鎬ц兘娴嬭瘯缁撴灉: p95=${p95}ms, 闃堝€?${P95_THRESHOLD_MS}ms`);
    expect(p95).toBeLessThan(P95_THRESHOLD_MS);
  });
});

