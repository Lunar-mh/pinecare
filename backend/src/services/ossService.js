'use strict';

const axios = require('axios');
const ossConfig = require('../config/oss');
const {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
} = require('../utils/thirdParty');
const { recordProviderSuccess } = require('../utils/providerRuntime');
const { resolveIntegrationMode } = require('../config/integrationMode');
const { buildCapabilityReport } = require('./integrationCapability/buildReport');

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

function hasLiveConfig() {
  return (
    Boolean(process.env.OSS_UPLOAD_API_URL || ossConfig.endpoint || '') &&
    (Boolean(process.env.OSS_UPLOAD_TOKEN) ||
      (Boolean(ossConfig.accessKeyId) && Boolean(ossConfig.accessKeySecret)))
  );
}

function getRequestedMode() {
  return process.env.OSS_MODE || 'auto';
}

function getModeStrategy() {
  return resolveIntegrationMode({
    requestedMode: getRequestedMode(),
    liveConfigured: hasLiveConfig(),
  });
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
    timeout: 'OSS upload timed out.',
    rateLimited: 'OSS upload is rate limited.',
    unavailable: 'OSS service is unavailable.',
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
      logThirdPartyError('oss-upload', err, { operation, attempt: attempt + 1 });

      if (!isRetryableError(err) || attempt >= MAX_RETRY) {
        throw toOssError(err);
      }

      await sleep(100 * (attempt + 1));
    }
  }

  throw toOssError(lastError);
}

async function uploadWithLiveApi(kind, content, key, contentType) {
  if (!hasLiveConfig()) {
    throw toOssError(new Error('OSS live mode requires endpoint and credentials.'));
  }

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
    const err = new Error('OSS upload response is invalid.');
    err.code = 'INVALID_OSS_RESPONSE';
    throw toOssError(err);
  }

  recordProviderSuccess('oss-upload', {
    operation: 'upload',
    mode: 'live',
    kind,
    key: normalizeKey(key),
    bucket: ossConfig.bucket,
    url,
  });
  return url;
}

async function uploadByKind(kind, content, key, contentType) {
  const safeKey = normalizeKey(key);
  const strategy = getModeStrategy();

  if (strategy.effectiveMode === 'live') {
    return uploadWithLiveApi(kind, content, safeKey, contentType);
  }

  if (!strategy.stubAllowed) {
    throw toOssError(new Error('OSS stub mode is disabled in PRODUCTION_LIVE mode.'));
  }

  await simulateUpload(kind, safeKey, content);
  const url = buildPublicUrl(ossConfig.bucket, safeKey);
  recordProviderSuccess('oss-upload', {
    operation: 'upload',
    mode: 'stub',
    kind,
    key: safeKey,
    bucket: ossConfig.bucket,
    url,
  });
  return url;
}

async function uploadAudio(content, key) {
  return uploadByKind('audio', content, key, 'audio/wav');
}

async function uploadImage(content, key) {
  return uploadByKind('image', content, key, 'image/jpeg');
}

function isLiveMode() {
  return getModeStrategy().effectiveMode === 'live';
}

function getCapabilityReport() {
  return buildCapabilityReport('oss-upload', getModeStrategy());
}

module.exports = {
  uploadAudio,
  uploadImage,
  buildPublicUrl,
  isLiveMode,
  getCapabilityReport,
};
