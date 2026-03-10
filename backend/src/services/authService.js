'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const UserModel = require('../models/user');
const AuditLogModel = require('../models/auditLog');
const smsService = require('./smsService');
const wechatService = require('./wechatService');

const ACCESS_EXPIRES_IN = '15m';
const ACCESS_EXPIRES_SECONDS = 15 * 60;
const REFRESH_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60;
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 30;

function createBusinessError(code, message, data = null, httpStatus = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = httpStatus || code;
  err.data = data;
  return err;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'fallback_secret';
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || getJwtSecret();
}

function refreshTokenKey(userId) {
  return `auth:refresh:${userId}`;
}

function toPublicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    openid: user.openid,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    real_name: user.real_name,
    age: user.age,
    gender: user.gender,
    chronic_diseases: Array.isArray(user.chronic_diseases) ? user.chronic_diseases : [],
    account_status: user.account_status,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login_at: user.last_login_at,
  };
}

async function writeAuditLog(userId, action, context = {}, details = null) {
  await AuditLogModel.create({
    userId: userId || null,
    action,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    details,
  });
}

async function issueTokens(userId, extraClaims = {}) {
  const accessClaims = { userId, ...extraClaims };
  const refreshClaims = {
    userId,
    token_type: 'refresh',
    ...extraClaims,
    jti: uuidv4(),
  };

  const accessToken = jwt.sign(accessClaims, getJwtSecret(), { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign(refreshClaims, getRefreshSecret(), { expiresIn: REFRESH_EXPIRES_IN });

  await redis.set(refreshTokenKey(userId), refreshToken, 'EX', REFRESH_EXPIRES_SECONDS);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_EXPIRES_SECONDS,
  };
}

async function sendSms(phone, purpose, context = {}) {
  const result = await smsService.sendSms(phone, purpose);
  await writeAuditLog(null, 'send_sms', context, { phone, purpose });
  return result;
}

async function registerPhone({ phone, code, password, ipAddress, userAgent }) {
  const context = { ipAddress, userAgent };
  const existed = await UserModel.findByPhone(phone);
  if (existed) {
    throw createBusinessError(409, 'Phone already registered.', null, 409);
  }

  const verifyResult = await smsService.verifyAndConsumeCode(phone, code, 'register');
  if (!verifyResult.valid) {
    throw createBusinessError(400, verifyResult.message || 'Invalid SMS code.', null, 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.createWithPhone({ phone, passwordHash });

  const tokens = await issueTokens(user.id);
  await writeAuditLog(user.id, 'register', context, { method: 'phone' });

  return {
    ...tokens,
    user: toPublicUser(user),
  };
}

function getLockUntilDate() {
  return new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
}

function isLocked(user) {
  if (user.account_status !== 'locked') return false;
  if (!user.locked_until) return false;
  return new Date(user.locked_until).getTime() > Date.now();
}

async function loginPhone({ phone, password, ipAddress, userAgent }) {
  const context = { ipAddress, userAgent };
  let user = await UserModel.findByPhone(phone);

  if (!user) {
    await writeAuditLog(null, 'login_fail', context, { phone, reason: 'not_found' });
    throw createBusinessError(401, 'Invalid phone or password.', null, 401);
  }

  if (user.account_status === 'deleted') {
    await writeAuditLog(user.id, 'login_fail', context, { reason: 'deleted' });
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }

  if (isLocked(user)) {
    throw createBusinessError(423, 'Account is locked.', { locked_until: user.locked_until }, 423);
  }

  if (user.account_status === 'locked') {
    await UserModel.clearFailedAttempts(user.id);
    user = await UserModel.findById(user.id);
  }

  if (!user.password_hash) {
    await writeAuditLog(user.id, 'login_fail', context, { reason: 'no_password' });
    throw createBusinessError(401, 'Password login is unavailable for this account.', null, 401);
  }

  const passOk = await bcrypt.compare(password, user.password_hash);
  if (!passOk) {
    const failedAttempts = Number(user.failed_login_attempts || 0) + 1;

    if (failedAttempts >= LOCK_THRESHOLD) {
      const lockedUntil = getLockUntilDate();
      await UserModel.setAccountLock(user.id, lockedUntil, failedAttempts);
      await writeAuditLog(user.id, 'login_fail', context, {
        reason: 'locked',
        failed_attempts: failedAttempts,
        locked_until: lockedUntil,
      });
      throw createBusinessError(423, 'Account is locked.', { locked_until: lockedUntil }, 423);
    }

    await UserModel.incrementFailedLoginAttempts(user.id);
    await writeAuditLog(user.id, 'login_fail', context, {
      reason: 'wrong_password',
      failed_attempts: failedAttempts,
    });
    throw createBusinessError(401, 'Invalid phone or password.', null, 401);
  }

  await UserModel.markLoginSuccess(user.id);
  user = await UserModel.findById(user.id);

  const tokens = await issueTokens(user.id);
  await writeAuditLog(user.id, 'login_success', context, { method: 'phone' });

  return {
    ...tokens,
    user: toPublicUser(user),
  };
}

async function loginPhoneByCode({ phone, code, ipAddress, userAgent }) {
  const context = { ipAddress, userAgent };

  const verifyResult = await smsService.verifyAndConsumeCode(phone, code, 'login');
  if (!verifyResult.valid) {
    await writeAuditLog(null, 'login_fail', context, { phone, reason: 'sms_invalid' });
    throw createBusinessError(400, verifyResult.message || 'Invalid SMS code.', null, 400);
  }

  let user = await UserModel.findByPhone(phone);
  if (!user) {
    user = await UserModel.createWithPhone({ phone, passwordHash: null });
    await writeAuditLog(user.id, 'register', context, { method: 'sms_login' });
  }

  if (user.account_status === 'deleted') {
    await writeAuditLog(user.id, 'login_fail', context, { reason: 'deleted' });
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }

  if (isLocked(user)) {
    throw createBusinessError(423, 'Account is locked.', { locked_until: user.locked_until }, 423);
  }

  if (user.account_status === 'locked') {
    await UserModel.clearFailedAttempts(user.id);
    user = await UserModel.findById(user.id);
  }

  await UserModel.markLoginSuccess(user.id);
  user = await UserModel.findById(user.id);

  const tokens = await issueTokens(user.id);
  await writeAuditLog(user.id, 'login_success', context, { method: 'sms_code' });

  return {
    ...tokens,
    user: toPublicUser(user),
  };
}

async function loginAdmin({ username, password, ipAddress, userAgent }) {
  const context = { ipAddress, userAgent };
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (username !== adminUsername || password !== adminPassword) {
    await writeAuditLog(null, 'admin_login_fail', context, { username });
    throw createBusinessError(401, 'Invalid admin username or password.', null, 401);
  }

  const tokens = await issueTokens(0, { role: 'admin', isAdmin: true });
  await writeAuditLog(null, 'admin_login_success', context, { username });

  return {
    ...tokens,
    username: adminUsername,
    role: 'admin',
  };
}

async function refreshToken(refreshTokenValue, context = {}) {
  if (!refreshTokenValue) {
    throw createBusinessError(400, 'refresh_token is required.', null, 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshTokenValue, getRefreshSecret());
  } catch (_err) {
    throw createBusinessError(401, 'Invalid refresh_token.', null, 401);
  }

  if (
    typeof decoded.userId !== 'number' ||
    decoded.userId < 0 ||
    decoded.token_type !== 'refresh'
  ) {
    throw createBusinessError(401, 'Invalid refresh_token.', null, 401);
  }

  const key = refreshTokenKey(decoded.userId);
  const cachedToken = await redis.get(key);

  if (!cachedToken || cachedToken !== refreshTokenValue) {
    throw createBusinessError(401, 'refresh_token mismatch.', null, 401);
  }

  const extraClaims = {};
  if (decoded.role) extraClaims.role = decoded.role;
  if (decoded.isAdmin !== undefined) extraClaims.isAdmin = decoded.isAdmin;

  const nextTokens = await issueTokens(decoded.userId, extraClaims);
  await writeAuditLog(decoded.userId, 'refresh', context, null);

  return {
    access_token: nextTokens.access_token,
    refresh_token: nextTokens.refresh_token,
    expires_in: nextTokens.expires_in,
  };
}

async function loginWithWechat({ code, userInfo = {}, ipAddress, userAgent }) {
  const context = { ipAddress, userAgent };
  const session = await wechatService.code2Session(code);

  let user = await UserModel.findByOpenid(session.openid);
  if (!user) {
    user = await UserModel.createWithWechat({
      openid: session.openid,
      nickname: userInfo.nickName || null,
      avatarUrl: userInfo.avatarUrl || null,
    });
  } else {
    user = await UserModel.updateWechatProfile(user.id, {
      nickname: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
    });
  }

  if (user.account_status === 'deleted') {
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }

  if (isLocked(user)) {
    throw createBusinessError(423, 'Account is locked.', { locked_until: user.locked_until }, 423);
  }

  if (user.account_status === 'locked') {
    await UserModel.clearFailedAttempts(user.id);
    user = await UserModel.findById(user.id);
  }

  const tokens = await issueTokens(user.id);
  await writeAuditLog(user.id, 'wechat_login', context, {
    openid: session.openid,
  });

  return {
    ...tokens,
    user: toPublicUser(user),
  };
}

async function unlockAccountByCode(phone, code, context = {}) {
  const verifyResult = await smsService.verifyAndConsumeCode(phone, code, 'login');
  if (!verifyResult.valid) {
    throw createBusinessError(400, verifyResult.message || 'Invalid SMS code.', null, 400);
  }

  const user = await UserModel.findByPhone(phone);
  if (!user) {
    throw createBusinessError(404, 'User not found.', null, 404);
  }

  if (user.account_status === 'deleted') {
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }

  const unlockedUser = await UserModel.unlockByPhone(phone);
  await writeAuditLog(unlockedUser.id, 'unlock', context, { method: 'sms_code' });

  return {
    account_status: unlockedUser.account_status,
    locked_until: unlockedUser.locked_until,
  };
}

module.exports = {
  sendSms,
  registerPhone,
  loginPhone,
  loginAdmin,
  loginPhoneByCode,
  refreshToken,
  loginWithWechat,
  unlockAccountByCode,
};
