'use strict';

const crypto = require('crypto');

// 规范字段顺序：必须稳定，保证同一业务数据生成同一哈希
const RECORD_FIELDS = [
  'prev_hash',
  'provider_id',
  'recipient_id',
  'service_type',
  'start_time',
  'end_time',
  'duration_hours',
  'time_coins',
  'location_hash',
  'status',
];

/**
 * 统一规范化值，避免 undefined/null/日期格式导致哈希不稳定
 * @param {any} value
 * @returns {string|number}
 */
function normalizeValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const ts = Date.parse(value);
    if (!Number.isNaN(ts)) {
      return ts;
    }

    return value.trim();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
}

/**
 * 获取 HMAC 密钥，优先使用 HASH_SECRET 环境变量
 * @returns {string}
 */
function getHmacSecret() {
  const secret = String(process.env.HASH_SECRET || '').trim();
  if (!secret) {
    throw new Error('HASH_SECRET environment variable is required for hash chain integrity.');
  }
  return secret;
}

/**
 * 生成 HMAC-SHA256 哈希（使用 HASH_SECRET 作为密钥）
 * @param {any} data
 * @returns {string}
 */
function generateHash(data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHmac('sha256', getHmacSecret()).update(payload).digest('hex');
}

/**
 * 按规范字段顺序生成服务记录哈希
 * @param {object} record
 * @returns {string}
 */
function generateRecordHash(record) {
  const ordered = {};

  for (const field of RECORD_FIELDS) {
    ordered[field] = normalizeValue(record[field]);
  }

  return generateHash(ordered);
}

/**
 * 校验当前记录哈希是否与前序哈希和记录数据匹配
 * @param {string} currentHash
 * @param {string} prevHash
 * @param {object} recordData
 * @returns {boolean}
 */
function verifyChain(currentHash, prevHash, recordData) {
  const expected = generateRecordHash({
    ...recordData,
    prev_hash: prevHash,
  });

  return expected === currentHash;
}

module.exports = {
  generateHash,
  generateRecordHash,
  verifyChain,
};
