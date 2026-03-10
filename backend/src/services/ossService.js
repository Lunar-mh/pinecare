'use strict';

const axios = require('axios');
const ossConfig = require('../config/oss');

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
  baseURL: ossConfig.endpoint || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
}

function isLiveMode() {
  return (
    String(process.env.OSS_MODE || '').toLowerCase() === 'live' &&
    Boolean(ossConfig.endpoint) &&
    Boolean(ossConfig.accessKeyId) &&
    Boolean(ossConfig.accessKeySecret)
  );
}

function buildPublicUrl(bucket, key) {
  const safeBucket = String(bucket || ossConfig.bucket || 'family-space').trim();
  const safeKey = normalizeKey(key)
    .split('/')
    .filter(Boolean)
    .map((item) => encodeURIComponent(item))
    .join('/');

  return `https://oss.example.com/${safeBucket}/${safeKey}`;
}

async function simulateUpload(kind, key, content) {
  await mockHttpClient.post('/mock-upload', {
    kind,
    key: normalizeKey(key),
    size: Buffer.isBuffer(content) ? content.length : 0,
  });
}

async function uploadWithLiveApi(kind, content, key, contentType) {
  const payload = {
    bucket: ossConfig.bucket,
    key: normalizeKey(key),
    kind,
    contentType,
    data: Buffer.from(content).toString('base64'),
  };

  const headers = {
    'X-OSS-ACCESS-KEY-ID': ossConfig.accessKeyId,
    'X-OSS-ACCESS-KEY-SECRET': ossConfig.accessKeySecret,
  };

  const response = await liveHttpClient.post('/upload', payload, { headers });
  const data = response.data || {};

  if (!data.url || typeof data.url !== 'string') {
    throw new Error('Invalid OSS upload response.');
  }

  return data.url;
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
