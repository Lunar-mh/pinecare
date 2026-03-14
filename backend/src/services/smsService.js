'use strict';

const crypto = require('crypto');
const redis = require('../config/redis');
const SmsCodeModel = require('../models/smsCode');

const CODE_TTL_SECONDS = 300;
const DAILY_LIMIT = 10;
const VERIFY_FAIL_LIMIT = 5;
const VERIFY_FAIL_WINDOW_SECONDS = 300;
const PURPOSES = new Set(['register', 'login', 'bind', 'reset_password', 'account_delete']);

function createBusinessError(code, message, data = null, httpStatus = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = httpStatus || code;
  err.data = data;
  return err;
}

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendSms(phone, purpose) {
  if (!PURPOSES.has(purpose)) {
    throw createBusinessError(400, 'Unsupported SMS purpose.', null, 400);
  }

  const dateKey = getDateKey();
  const countKey = `sms:count:${phone}:${dateKey}`;
  const count = await redis.incr(countKey);
  if (count === 1) {
    await redis.expire(countKey, 24 * 60 * 60);
  }

  if (count > DAILY_LIMIT) {
    throw createBusinessError(429, 'SMS daily limit exceeded.', { daily_limit: DAILY_LIMIT }, 429);
  }

  const code = generateCode();
  const redisKey = `sms:code:${phone}:${purpose}`;
  await redis.set(redisKey, code, 'EX', CODE_TTL_SECONDS);

  await SmsCodeModel.create({
    phone,
    code,
    purpose,
    expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
  });

  return {
    sent: true,
  };
}

async function verifyAndConsumeCode(phone, code, purpose) {
  if (!PURPOSES.has(purpose)) {
    return { valid: false, message: 'Unsupported SMS purpose.' };
  }

  // 验证失败次数限制，防止暴力枚举
  const failKey = `sms:verify_fail:${phone}:${purpose}`;
  const failCount = Number(await redis.get(failKey) || 0);
  if (failCount >= VERIFY_FAIL_LIMIT) {
    return { valid: false, message: 'Too many failed verification attempts. Please request a new code.' };
  }

  const redisKey = `sms:code:${phone}:${purpose}`;
  const cachedCode = await redis.get(redisKey);

  if (cachedCode) {
    if (cachedCode !== code) {
      // 记录失败次数
      const newCount = await redis.incr(failKey);
      if (newCount === 1) {
        await redis.expire(failKey, VERIFY_FAIL_WINDOW_SECONDS);
      }
      return { valid: false, message: 'Invalid SMS code.' };
    }

    await redis.del(redisKey);
    await redis.del(failKey);

    const latest = await SmsCodeModel.findLatestByPhoneAndPurpose(phone, purpose);
    if (latest && latest.code === code && !latest.used) {
      await SmsCodeModel.markUsed(latest.id);
    }

    return { valid: true };
  }

  const dbResult = await SmsCodeModel.verifyAndConsume(phone, code, purpose);
  if (!dbResult.valid) {
    const newCount = await redis.incr(failKey);
    if (newCount === 1) {
      await redis.expire(failKey, VERIFY_FAIL_WINDOW_SECONDS);
    }
  } else {
    await redis.del(failKey);
  }
  return dbResult;
}

module.exports = {
  generateCode,
  sendSms,
  verifyAndConsumeCode,
};