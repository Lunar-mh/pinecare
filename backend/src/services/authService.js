'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const UserModel = require('../models/user');
const smsService = require('./smsService');
const { createBizError } = require('../utils/serviceError');
const { writeAuditLog: writeAuditEntry } = require('../utils/auditLogHelper');
const wechatService = require('./wechatService');

const ACCESS_EXPIRES_IN = '15m';
const ACCESS_EXPIRES_SECONDS = 15 * 60;
const REFRESH_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60;
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 30;

const createBusinessError = (code, message, data = null, httpStatus = null) => (
  createBizError(code, message, httpStatus || code, data)
);

function requiredEnv(name, message) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw createBusinessError(500, message, null, 500);
  }
  return value;
}

function getJwtSecret() {
  return requiredEnv('JWT_SECRET', 'JWT_SECRET is not configured.');
}

function getRefreshSecret() {
  const refreshSecret = String(process.env.JWT_REFRESH_SECRET || '').trim();
  if (!refreshSecret) {
    throw createBusinessError(500, 'JWT_REFRESH_SECRET is not configured. It must differ from JWT_SECRET.', null, 500);
  }
  if (refreshSecret === getJwtSecret()) {
    throw createBusinessError(500, 'JWT_REFRESH_SECRET must differ from JWT_SECRET.', null, 500);
  }
  return refreshSecret;
}

function getAdminCredentials() {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '').trim();

  if (!username || !password) {
    throw createBusinessError(503, 'Admin credentials are not configured.', null, 503);
  }

  return { username, password };
}

function refreshTokenKey(userId) {
  return `auth:refresh:${userId}`;
}

function createContext(ipAddress, userAgent, requestId) {
  return { ipAddress, userAgent, requestId };
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
  await writeAuditEntry({ userId, action, context, details });
}

async function issueTokens(userId, extraClaims = {}) {
  const accessToken = jwt.sign({ userId, ...extraClaims }, getJwtSecret(), {
    expiresIn: ACCESS_EXPIRES_IN,
  });
  const refreshToken = jwt.sign(
    { userId, token_type: 'refresh', ...extraClaims, jti: uuidv4() },
    getRefreshSecret(),
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  await redis.set(refreshTokenKey(userId), refreshToken, 'EX', REFRESH_EXPIRES_SECONDS);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_EXPIRES_SECONDS,
  };
}

function getLockUntilDate() {
  return new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
}

function isLocked(user) {
  return (
    user.account_status === 'locked' &&
    user.locked_until &&
    new Date(user.locked_until).getTime() > Date.now()
  );
}

async function reviveLockedAccount(user) {
  if (user.account_status !== 'locked') {
    return user;
  }

  await UserModel.clearFailedAttempts(user.id);
  return UserModel.findById(user.id);
}

async function resolveActiveUser(user, context, options = {}) {
  if (user.account_status === 'deleted') {
    if (options.auditAction) {
      await writeAuditLog(user.id, options.auditAction, context, { reason: 'deleted' });
    }
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }

  if (isLocked(user)) {
    throw createBusinessError(423, 'Account is locked.', { locked_until: user.locked_until }, 423);
  }

  return reviveLockedAccount(user);
}

function authResult(tokens, user) {
  return { ...tokens, user: toPublicUser(user) };
}

async function finalizeUserLogin(user, context, auditAction, details, extraClaims = {}) {
  await UserModel.markLoginSuccess(user.id);
  const freshUser = (await UserModel.findById(user.id)) || user;
  const tokens = await issueTokens(freshUser.id, extraClaims);
  await writeAuditLog(freshUser.id, auditAction, context, details);
  return authResult(tokens, freshUser);
}

async function verifySmsCode(phone, code, purpose, message) {
  const verifyResult = await smsService.verifyAndConsumeCode(phone, code, purpose);
  if (!verifyResult.valid) {
    throw createBusinessError(400, verifyResult.message || message, null, 400);
  }
}

async function sendSms(phone, purpose, context = {}) {
  const result = await smsService.sendSms(phone, purpose);
  await writeAuditLog(null, 'send_sms', context, { phone, purpose });
  return result;
}

async function registerPhone({ phone, code, password, ipAddress, userAgent, requestId }) {
  const context = createContext(ipAddress, userAgent, requestId);

  if (await UserModel.findByPhone(phone)) {
    throw createBusinessError(409, 'Phone already registered.', null, 409);
  }

  await verifySmsCode(phone, code, 'register', 'Invalid SMS code.');
  const user = await UserModel.createWithPhone({
    phone,
    passwordHash: await bcrypt.hash(password, 10),
  });
  const tokens = await issueTokens(user.id);
  await writeAuditLog(user.id, 'register', context, { method: 'phone' });

  return authResult(tokens, user);
}

async function loginPhone({ phone, password, ipAddress, userAgent, requestId }) {
  const context = createContext(ipAddress, userAgent, requestId);
  let user = await UserModel.findByPhone(phone);

  if (!user) {
    await writeAuditLog(null, 'login_fail', context, { phone, reason: 'not_found' });
    throw createBusinessError(401, 'Invalid phone or password.', null, 401);
  }

  user = await resolveActiveUser(user, context, { auditAction: 'login_fail' });

  if (!user.password_hash) {
    await writeAuditLog(user.id, 'login_fail', context, { reason: 'no_password' });
    throw createBusinessError(401, 'Password login is unavailable for this account.', null, 401);
  }

  if (!(await bcrypt.compare(password, user.password_hash))) {
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

  return finalizeUserLogin(user, context, 'login_success', { method: 'phone' });
}

async function loginPhoneByCode({ phone, code, ipAddress, userAgent, requestId }) {
  const context = createContext(ipAddress, userAgent, requestId);

  try {
    await verifySmsCode(phone, code, 'login', 'Invalid SMS code.');
  } catch (error) {
    await writeAuditLog(null, 'login_fail', context, { phone, reason: 'sms_invalid' });
    throw error;
  }

  let user = await UserModel.findByPhone(phone);
  if (!user) {
    user = await UserModel.createWithPhone({ phone, passwordHash: null });
    await writeAuditLog(user.id, 'register', context, { method: 'sms_login' });
  }

  user = await resolveActiveUser(user, context, { auditAction: 'login_fail' });
  return finalizeUserLogin(user, context, 'login_success', { method: 'sms_code' });
}

async function loginAdmin({ username, password, ipAddress, userAgent, requestId }) {
  const context = createContext(ipAddress, userAgent, requestId);
  const admin = getAdminCredentials();

  if (username !== admin.username) {
    await writeAuditLog(null, 'admin_login_fail', context, { username });
    throw createBusinessError(401, 'Invalid admin username or password.', null, 401);
  }

  // 支持两种模式：如果密码以 $2a$ 或 $2b$ 开头则视为bcrypt哈希值，否则为明文（仅限dev）
  const storedPassword = admin.password;
  const isBcryptHash = /^\$2[aby]\$/.test(storedPassword);
  let passwordMatch = false;

  if (isBcryptHash) {
    passwordMatch = await bcrypt.compare(password, storedPassword);
  } else {
    // 明文对比仅在非 PRODUCTION_LIVE 下允许
    const { isProductionLive } = require('../config/runtimeMode');
    if (isProductionLive()) {
      throw createBusinessError(503, 'Admin password must be bcrypt-hashed in PRODUCTION_LIVE mode.', null, 503);
    }
    passwordMatch = (password === storedPassword);
  }

  if (!passwordMatch) {
    await writeAuditLog(null, 'admin_login_fail', context, { username });
    throw createBusinessError(401, 'Invalid admin username or password.', null, 401);
  }

  const tokens = await issueTokens(0, { role: 'admin', isAdmin: true });
  await writeAuditLog(null, 'admin_login_success', context, { username });
  return { ...tokens, username: admin.username, role: 'admin' };
}

function decodeRefreshToken(refreshTokenValue) {
  if (!refreshTokenValue) {
    throw createBusinessError(400, 'refresh_token is required.', null, 400);
  }

  try {
    return jwt.verify(refreshTokenValue, getRefreshSecret());
  } catch (_err) {
    throw createBusinessError(401, 'Invalid refresh_token.', null, 401);
  }
}

function validateRefreshPayload(decoded) {
  if (
    typeof decoded.userId !== 'number' ||
    decoded.userId < 0 ||
    decoded.token_type !== 'refresh'
  ) {
    throw createBusinessError(401, 'Invalid refresh_token.', null, 401);
  }
}

async function assertRefreshableUser(userId) {
  if (Number(userId) === 0) {
    return null;
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    await redis.del(refreshTokenKey(userId));
    throw createBusinessError(401, 'refresh_token subject is invalid.', null, 401);
  }

  if (user.account_status === 'deleted') {
    await redis.del(refreshTokenKey(userId));
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }

  if (isLocked(user)) {
    await redis.del(refreshTokenKey(userId));
    throw createBusinessError(423, 'Account is locked.', { locked_until: user.locked_until }, 423);
  }

  return user;
}

async function refreshToken(refreshTokenValue, context = {}) {
  const decoded = decodeRefreshToken(refreshTokenValue);
  validateRefreshPayload(decoded);

  const cachedToken = await redis.get(refreshTokenKey(decoded.userId));
  if (!cachedToken || cachedToken !== refreshTokenValue) {
    throw createBusinessError(401, 'refresh_token mismatch.', null, 401);
  }

  await assertRefreshableUser(decoded.userId);

  const nextTokens = await issueTokens(decoded.userId, {
    ...(decoded.role ? { role: decoded.role } : {}),
    ...(decoded.isAdmin !== undefined ? { isAdmin: decoded.isAdmin } : {}),
  });
  await writeAuditLog(decoded.userId, 'refresh', context, null);

  return {
    access_token: nextTokens.access_token,
    refresh_token: nextTokens.refresh_token,
    expires_in: nextTokens.expires_in,
  };
}

async function loginWithWechat({ code, userInfo = {}, ipAddress, userAgent, requestId }) {
  const context = createContext(ipAddress, userAgent, requestId);
  const session = await wechatService.code2Session(code);
  let user = await UserModel.findByOpenid(session.openid);

  user = user
    ? await UserModel.updateWechatProfile(user.id, {
        nickname: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
      })
    : await UserModel.createWithWechat({
        openid: session.openid,
        nickname: userInfo.nickName || null,
        avatarUrl: userInfo.avatarUrl || null,
      });

  user = await resolveActiveUser(user, context);
  const result = await finalizeUserLogin(user, context, 'wechat_login', { openid: session.openid });
  return result;
}

async function unlockAccountByCode(phone, code, context = {}) {
  await verifySmsCode(phone, code, 'login', 'Invalid SMS code.');
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
  getAdminCredentials,
  registerPhone,
  loginPhone,
  loginAdmin,
  loginPhoneByCode,
  refreshToken,
  loginWithWechat,
  unlockAccountByCode,
};

