'use strict';

const crypto = require('crypto');

/**
 * 将数据转换为稳定字符串，确保签名可重复验证
 * @param {any} data
 * @returns {string}
 */
function toStableString(data) {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return JSON.stringify(data.map((item) => toStableString(item)));
  }

  if (typeof data === 'object') {
    const sortedKeys = Object.keys(data).sort();
    const stableObj = {};
    for (const key of sortedKeys) {
      stableObj[key] = toStableString(data[key]);
    }
    return JSON.stringify(stableObj);
  }

  return String(data);
}

/**
 * 数字签名服务：使用 HMAC-SHA256 生成与验证签名
 */
class CredentialService {
  /**
   * 生成签名
   * @param {any} data
   * @param {string} secret
   * @returns {string}
   */
  generateSignature(data, secret) {
    const secretKey = secret || process.env.HASH_SECRET || 'timebank_default_secret';
    const payload = toStableString(data);

    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  /**
   * 验证签名
   * @param {any} data
   * @param {string} signature
   * @param {string} secret
   * @returns {boolean}
   */
  verifySignature(data, signature, secret) {
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    const expected = this.generateSignature(data, secret);

    // 使用 timingSafeEqual 防止时序攻击
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  /**
   * 生成平台签名
   * @param {number|string} recordId
   * @returns {string}
   */
  generatePlatformSignature(recordId) {
    const platformSecret =
      process.env.PLATFORM_PRIVATE_KEY || process.env.HASH_SECRET || 'timebank_platform_secret';

    return this.generateSignature({ recordId }, platformSecret);
  }
}

module.exports = new CredentialService();
