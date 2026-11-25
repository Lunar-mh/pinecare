'use strict';

const { createHmac } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const redisKeys = require('../config/redisKeys');
const UserModel = require('../models/user');
const smsService = require('./smsService');
const { createBusinessError } = require('../utils/serviceError');
const { writeAuditLog: writeAuditEntry } = require('../utils/auditLogHelper');
const { isProductionLive } = require('../config/runtimeMode');
const wechatService = require('./wechatService');

const ACCESS_EXPIRES_IN = '15m';
const ACCESS_EXPIRES_SECONDS = 15 * 60;
const REFRESH_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_SECONDS = 7 * 24 * 60 * 60;
const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 30;
const REFRESH_SECRET_DERIVATION_SALT = 'yinban.jwt.refresh.v1';
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

function deriveRefreshSecret(secret) {
  return createHmac('sha256', secret).update(REFRESH_SECRET_DERIVATION_SALT).digest('hex');
}

function getRefreshSecret() {
  const secret = getJwtSecret();
  const refreshSecret = String(process.env.JWT_REFRESH_SECRET || '').trim();

  if (refreshSecret && refreshSecret !== secret) {
    return refreshSecret;
  }

  if (isProductionLive()) {
    if (!refreshSecret) {
      throw createBusinessError(500, 'JWT_REFRESH_SECRET is not configured. It must differ from JWT_SECRET.', null, 500);
    }
    throw createBusinessError(500, 'JWT_REFRESH_SECRET must differ from JWT_SECRET.', null, 500);
  }

  const derived = deriveRefreshSecret(secret);
  process.env.JWT_REFRESH_SECRET = derived;
  return derived;
}

function isBcryptHash(value) {
  return /^\$2[aby]\$/.test(String(value || '').trim());
}

function getAdminCredentials() {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const passwordHash = String(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || '').trim();

  if (!username || !passwordHash) {
    throw createBusinessError(503, 'Admin credentials are not configured.', null, 503);
  }

  if (!isBcryptHash(passwordHash)) {
    throw createBusinessError(503, 'Admin password must be a bcrypt hash.', null, 503);
  }

  return { username, passwordHash };
}

function refreshTokenKey(userId) {
  return redisKeys.authRefreshToken(userId);
}

function adminSessionKey(sessionId) {
  return redisKeys.authAdminSession(sessionId);
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
  const isAdminIdentity = Number(userId) === 0 && (extraClaims.isAdmin === true || extraClaims.role === 'admin');
  const sessionId = isAdminIdentity ? uuidv4() : null;

  const accessPayload = { userId, ...extraClaims };
  if (sessionId) {
    accessPayload.sid = sessionId;
  }

  const refreshPayload = { userId, token_type: 'refresh', ...extraClaims, jti: uuidv4() };
  if (sessionId) {
    refreshPayload.sid = sessionId;
  }

  const accessToken = jwt.sign(accessPayload, getJwtSecret(), {
    expiresIn: ACCESS_EXPIRES_IN,
  });
  const refreshToken = jwt.sign(refreshPayload, getRefreshSecret(), {
    expiresIn: REFRESH_EXPIRES_IN,
  });

  await redis.set(refreshTokenKey(userId), refreshToken, 'EX', REFRESH_EXPIRES_SECONDS);

  if (sessionId) {
    await redis.set(adminSessionKey(sessionId), '1', 'EX', REFRESH_EXPIRES_SECONDS);
  }

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

async function handleFailedPasswordAttempt(user, context) {
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
    await handleFailedPasswordAttempt(user, context);
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

  const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
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

async function rotateAdminRefreshSession(decoded) {
  const isAdminRefresh =
    Number(decoded.userId) === 0 && (decoded.isAdmin === true || decoded.role === 'admin');
  if (Number(decoded.userId) === 0 && !isAdminRefresh) {
    throw createBusinessError(401, 'Invalid refresh_token.', null, 401);
  }
  if (!isAdminRefresh) {
    return;
  }

  const sid = String(decoded.sid || '').trim();
  if (!sid) {
    throw createBusinessError(401, 'Invalid refresh_token.', null, 401);
  }

  const adminSession = await redis.get(adminSessionKey(sid));
  if (!adminSession) {
    throw createBusinessError(401, 'Invalid refresh_token.', null, 401);
  }

  await redis.del(adminSessionKey(sid));
}

async function refreshToken(refreshTokenValue, context = {}) {
  const decoded = decodeRefreshToken(refreshTokenValue);
  validateRefreshPayload(decoded);

  const cachedToken = await redis.get(refreshTokenKey(decoded.userId));
  if (!cachedToken || cachedToken !== refreshTokenValue) {
    throw createBusinessError(401, 'refresh_token mismatch.', null, 401);
  }

  await assertRefreshableUser(decoded.userId);
  await rotateAdminRefreshSession(decoded);

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

/**
 * 请求密码重置 - 发送验证码
 */
async function requestPasswordReset(phone, context = {}) {
  const user = await UserModel.findByPhone(phone);

  if (!user) {
    // 为了安全，不透露账号是否存在
    await writeAuditLog(null, 'password_reset_request', context, { phone, reason: 'not_found' });
    return { message: 'If the phone number is registered, you will receive an SMS code.' };
  }

  if (user.account_status === 'deleted') {
    await writeAuditLog(user.id, 'password_reset_request', context, { reason: 'deleted' });
    return { message: 'If the phone number is registered, you will receive an SMS code.' };
  }

  await smsService.sendSms(phone, 'reset_password');
  await writeAuditLog(user.id, 'password_reset_request', context, { phone });

  return { message: 'If the phone number is registered, you will receive an SMS code.' };
}

/**
 * 确认密码重置 - 验证码 + 新密码
 */
async function confirmPasswordReset({ phone, code, newPassword, ipAddress, userAgent, requestId }) {
  const context = createContext(ipAddress, userAgent, requestId);

  // 验证短信码
  await verifySmsCode(phone, code, 'reset_password', 'Invalid or expired SMS code.');

  const user = await UserModel.findByPhone(phone);
  if (!user) {
    throw createBusinessError(404, 'User not found.', null, 404);
  }

  if (user.account_status === 'deleted') {
    throw createBusinessError(403, 'Account has been deleted.', null, 403);
  }

  // 更新密码
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await UserModel.updatePassword(user.id, passwordHash);

  // 清除锁定状态（如果有）
  if (user.account_status === 'locked') {
    await UserModel.clearFailedAttempts(user.id);
  }

  // 使旧的 refresh token 失效
  await redis.del(refreshTokenKey(user.id));

  await writeAuditLog(user.id, 'password_reset_success', context, { method: 'sms_code' });

  return { message: 'Password has been reset successfully. Please login with your new password.' };
}

/**
 * 登出 - 使 refresh token 失效
 */
async function logout(userId, sessionId, context = {}) {
  // 删除用户的 refresh token
  await redis.del(refreshTokenKey(userId));

  // 如果是管理员，删除 session
  if (Number(userId) === 0 && sessionId) {
    await redis.del(adminSessionKey(sessionId));
  }

  await writeAuditLog(userId, 'logout', context, null);

  return { message: 'Logged out successfully.' };
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
  requestPasswordReset,
  confirmPasswordReset,
  logout,
};







