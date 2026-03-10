'use strict';

const axios = require('axios');
const ossConfig = require('../config/oss');

const mockHttpClient = axios.create({
  adapter: async (config) => {
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: {
        code: 0,
        message: '模拟上传成功',
      },
    };
  },
});

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
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

async function uploadAudio(content, key) {
  const safeKey = normalizeKey(key);
  await simulateUpload('audio', safeKey, content);
  return buildPublicUrl(ossConfig.bucket, safeKey);
}

async function uploadImage(content, key) {
  const safeKey = normalizeKey(key);
  await simulateUpload('image', safeKey, content);
  return buildPublicUrl(ossConfig.bucket, safeKey);
}

module.exports = {
  uploadAudio,
  uploadImage,
  buildPublicUrl,
};
