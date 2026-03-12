'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

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

function normalizeSecret(secret) {
  return String(secret || '').trim();
}

function createConfigError(secretName, message) {
  const err = new Error(message);
  err.code = 503;
  err.statusCode = 503;
  err.secretName = secretName;
  return err;
}

class CredentialService {
  getHashSecret() {
    const hashSecret = normalizeSecret(process.env.HASH_SECRET);
    if (hashSecret) {
      return hashSecret;
    }

    const message = 'HASH_SECRET is required for signature generation.';
    logger.error('credentialService', 'missing_hash_secret', { message, secretName: 'HASH_SECRET' });
    throw createConfigError('HASH_SECRET', message);
  }

  getPlatformPrivateKey() {
    const platformSecret = normalizeSecret(process.env.PLATFORM_PRIVATE_KEY);
    if (platformSecret) {
      return platformSecret;
    }

    const message = 'PLATFORM_PRIVATE_KEY is required for platform signature generation.';
    logger.error('credentialService', 'missing_platform_private_key', {
      message,
      secretName: 'PLATFORM_PRIVATE_KEY',
    });
    throw createConfigError('PLATFORM_PRIVATE_KEY', message);
  }

  createScopedSecret(scope, subjectId) {
    return `${this.getHashSecret()}:${scope}:${subjectId}`;
  }

  generateSignature(data, secret) {
    const secretKey = normalizeSecret(secret) || this.getHashSecret();
    const payload = toStableString(data);

    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  verifySignature(data, signature, secret) {
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    let expected;
    try {
      expected = this.generateSignature(data, secret);
    } catch (err) {
      if (err && err.secretName) {
        return false;
      }
      throw err;
    }

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  generatePlatformSignature(recordId) {
    return this.generateSignature({ recordId }, this.getPlatformPrivateKey());
  }
}

module.exports = new CredentialService();
