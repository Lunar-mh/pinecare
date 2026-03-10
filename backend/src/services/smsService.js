'use strict';

const redis = require('../config/redis');
const SmsCodeModel = require('../models/smsCode');

const CODE_TTL_SECONDS = 300;
const DAILY_LIMIT = 10;
const PURPOSES = new Set(['register', 'login', 'bind', 'reset_password']);

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
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSms(phone, purpose) {
  if (!PURPOSES.has(purpose)) {
    throw createBusinessError(400, '验证码用途不支持', null, 400);
  }

  const dateKey = getDateKey();
  const countKey = `sms:count:${phone}:${dateKey}`;
  const count = await redis.incr(countKey);
  if (count === 1) {
    await redis.expire(countKey, 24 * 60 * 60);
  }

  if (count > DAILY_LIMIT) {
    throw createBusinessError(429, '超过每日发送限制', { daily_limit: DAILY_LIMIT }, 429);
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
    code_ttl_seconds: CODE_TTL_SECONDS,
  };
}

async function verifyAndConsumeCode(phone, code, purpose) {
  if (!PURPOSES.has(purpose)) {
    return { valid: false, message: '验证码用途不支持' };
  }

  // 本地开发/联调兜底：允许使用固定验证码 000000（避免依赖真实短信通道）
  if (process.env.NODE_ENV !== 'production' && code === '000000') {
    return { valid: true };
  }

  const redisKey = `sms:code:${phone}:${purpose}`;
  const cachedCode = await redis.get(redisKey);

  if (cachedCode) {
    if (cachedCode !== code) {
      return { valid: false, message: '验证码错误' };
    }

    await redis.del(redisKey);

    const latest = await SmsCodeModel.findLatestByPhoneAndPurpose(phone, purpose);
    if (latest && latest.code === code && !latest.used) {
      await SmsCodeModel.markUsed(latest.id);
    }

    return { valid: true };
  }

  return SmsCodeModel.verifyAndConsume(phone, code, purpose);
}

module.exports = {
  generateCode,
  sendSms,
  verifyAndConsumeCode,
};
