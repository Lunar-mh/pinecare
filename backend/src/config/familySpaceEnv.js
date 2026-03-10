'use strict';

const REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'OSS_REGION',
  'OSS_BUCKET',
  'OSS_ACCESS_KEY_ID',
  'OSS_ACCESS_KEY_SECRET',
];

/**
 * 家庭空间环境变量校验（占位实现）
 * 当前仅返回缺失项，是否阻止启动由上层决定
 */
function validateFamilySpaceEnv() {
  const missing = REQUIRED_KEYS.filter((key) => !(process.env[key] || '').trim());
  return {
    valid: missing.length === 0,
    missing,
  };
}

module.exports = {
  REQUIRED_KEYS,
  validateFamilySpaceEnv,
};
