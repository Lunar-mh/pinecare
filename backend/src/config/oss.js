'use strict';

/**
 * OSS 配置占位文件
 * 仅负责读取环境变量，不实例化真实 OSS 客户端
 */
const ossConfig = {
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  bucket: process.env.OSS_BUCKET || 'family-space',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  endpoint: process.env.OSS_ENDPOINT || '',
  timeoutMs: Number(process.env.OSS_TIMEOUT_MS || 10000),
};

module.exports = ossConfig;
