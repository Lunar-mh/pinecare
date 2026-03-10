'use strict';

const axios = require('axios');
const ossConfig = require('../config/oss');
const {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
} = require('../utils/thirdParty');

const MAX_RETRY = Math.max(0, Number(process.env.OSS_MAX_RETRY || 2));

const mockHttpClient = axios.create({
  adapter: async (config) => ({
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    data: {
      code: 0,
      message: 'mock upload success',
    },
  }),
});

const liveHttpClient = axios.create({
  timeout: ossConfig.timeoutMs,
  baseURL: process.env.OSS_UPLOAD_API_URL || ossConfig.endpoint || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
}

function sanitizePathPart(text) {
  return String(text || '')
    .split('/')
    .filter(Boolean)
    .map((item) => encodeURIComponent(item))
    .join('/');
}

function isLiveMode() {
  return (
    String(process.env.OSS_MODE || '').toLowerCase() === 'live' &&
    Boolean(process.env.OSS_UPLOAD_API_URL || ossConfig.endpoint || '') &&
    (Boolean(process.env.OSS_UPLOAD_TOKEN) ||
      (Boolean(ossConfig.accessKeyId) && Boolean(ossConfig.accessKeySecret)))
  );
}

function getLiveHeaders() {
  const token = String(process.env.OSS_UPLOAD_TOKEN || '').trim();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {
    'X-OSS-ACCESS-KEY-ID': ossConfig.accessKeyId,
    'X-OSS-ACCESS-KEY-SECRET': ossConfig.accessKeySecret,
  };
}

function buildPublicUrl(bucket, key) {
  const safeBucket = String(bucket || ossConfig.bucket || 'family-space').trim();
  const safeKey = sanitizePathPart(normalizeKey(key));

  const publicBase = String(process.env.OSS_PUBLIC_BASE_URL || '').trim();
  if (publicBase) {
    return `${publicBase.replace(/\/+$/, '')}/${safeKey}`;
  }

  if (ossConfig.endpoint && /^https?:\/\//i.test(ossConfig.endpoint)) {
    return `${ossConfig.endpoint.replace(/\/+$/, '')}/${safeBucket}/${safeKey}`;
  }

  return `https://${safeBucket}.${ossConfig.region}.aliyuncs.com/${safeKey}`;
}

async function simulateUpload(kind, key, content) {
  await mockHttpClient.post('/mock-upload', {
    kind,
    key: normalizeKey(key),
    size: Buffer.isBuffer(content) ? content.length : 0,
  });
}

function toOssError(err) {
  return createUpstreamError(err, {
    timeout: 'OSS upload timeout.',
    rateLimited: 'OSS upload rate limited.',
    unavailable: 'OSS upload service unavailable.',
    failed: 'OSS upload failed.',
  });
}

async function requestWithRetry(operation, requestFactory) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      return await requestFactory();
    } catch (err) {
      lastError = err;
      logThirdPartyError('oss-upload', err, {
        operation,
        attempt: attempt + 1,
      });

      if (!isRetryableError(err) || attempt >= MAX_RETRY) {
        throw toOssError(err);
      }

      await sleep(100 * (attempt + 1));
    }
  }

  throw toOssError(lastError);
}

async function uploadWithLiveApi(kind, content, key, contentType) {
  const payload = {
    bucket: ossConfig.bucket,
    key: normalizeKey(key),
    kind,
    contentType,
    data: Buffer.from(content).toString('base64'),
  };

  const response = await requestWithRetry('uploadWithLiveApi', () =>
    liveHttpClient.post('/upload', payload, { headers: getLiveHeaders() })
  );

  const data = response.data || {};
  const url = data.url || (data.data && data.data.url);
  if (!url || typeof url !== 'string') {
    const err = new Error('Invalid OSS upload response.');
    err.code = 'INVALID_OSS_RESPONSE';
    throw toOssError(err);
  }

  return url;
}

async function uploadAudio(content, key) {
  const safeKey = normalizeKey(key);

  if (isLiveMode()) {
    return uploadWithLiveApi('audio', content, safeKey, 'audio/wav');
  }

  await simulateUpload('audio', safeKey, content);
  return buildPublicUrl(ossConfig.bucket, safeKey);
}

async function uploadImage(content, key) {
  const safeKey = normalizeKey(key);

  if (isLiveMode()) {
    return uploadWithLiveApi('image', content, safeKey, 'image/jpeg');
  }

  await simulateUpload('image', safeKey, content);
  return buildPublicUrl(ossConfig.bucket, safeKey);
}

module.exports = {
  uploadAudio,
  uploadImage,
  buildPublicUrl,
  isLiveMode,
};
