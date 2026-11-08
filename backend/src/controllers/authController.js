'use strict';

const { ok, fail } = require('../utils/response');
const authService = require('../services/authService');
const { getRequestContext } = require('../utils/requestMeta');
const {
  validatePhone,
  validateSmsCode,
  validatePassword,
  validateRequired,
} = require('../utils/validators');

const SMS_PURPOSES = new Set(['register', 'login', 'bind', 'reset_password', 'account_delete']);

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

function toMiniProgramLoginPayload(serviceData) {
  const payload = {
    token: serviceData.access_token,
    userInfo: serviceData.user,
  };

  if (serviceData.refresh_token) {
    payload.refresh_token = serviceData.refresh_token;
  }
  if (serviceData.expires_in !== undefined) {
    payload.expires_in = serviceData.expires_in;
  }

  return payload;
}

/**
 * @description 发送短信验证码控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 body.phone 与 body.purpose
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 统一输出 { code: 0, message: 'SMS sent.', data: null }
 */
async function sendSms(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['phone', 'purpose']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) return fail(res, 400, phoneCheck.message, null, 400);

    if (!SMS_PURPOSES.has(req.body.purpose)) {
      return fail(res, 400, 'Invalid purpose.', null, 400);
    }

    await authService.sendSms(req.body.phone, req.body.purpose, getRequestContext(req));
    return ok(res, null, 'SMS sent.');
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @description 手机号密码注册控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 phone, code, password
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 注册成功并签发双 Token
 */
async function registerPhone(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['phone', 'code', 'password']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) return fail(res, 400, phoneCheck.message, null, 400);

    const codeCheck = validateSmsCode(req.body.code);
    if (!codeCheck.valid) return fail(res, 400, codeCheck.message, null, 400);

    const passwordCheck = validatePassword(req.body.password);
    if (!passwordCheck.valid) return fail(res, 400, passwordCheck.message, null, 400);

    const data = await authService.registerPhone({
      phone: req.body.phone,
      code: req.body.code,
      password: req.body.password,
      ...getRequestContext(req),
    });

    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @description 手机号密码登录控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 phone, password
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 登录成功返回用户信息与双 Token
 */
async function loginPhone(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['phone', 'password']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) return fail(res, 400, phoneCheck.message, null, 400);

    const data = await authService.loginPhone({
      phone: req.body.phone,
      password: req.body.password,
      ...getRequestContext(req),
    });

    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @description 后台管理员账密登录控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 username, password
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 管理员凭据与有效 Token
 */
async function adminLogin(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['username', 'password']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const data = await authService.loginAdmin({
      username: String(req.body.username || '').trim(),
      password: String(req.body.password || ''),
      ...getRequestContext(req),
    });

    return ok(res, {
      token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      username: data.username,
      role: data.role,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @description 刷新访问 Token 控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 body.refresh_token
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 返回新的 access_token 与 refresh_token
 */
async function refreshToken(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['refresh_token']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const data = await authService.refreshToken(req.body.refresh_token, getRequestContext(req));
    return ok(res, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @description 微信快捷授权登录控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 body.code
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 微信登录授权结果
 */
async function loginWechat(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['code']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const data = await authService.loginWithWechat({
      code: req.body.code,
      userInfo: req.body.userInfo || {},
      ...getRequestContext(req),
    });

    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @description 微信小程序专属静默/快速登录控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 body.code
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 小程序标准 token + userInfo 结构
 */
async function loginWechatMiniProgram(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['code']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const data = await authService.loginWithWechat({
      code: req.body.code,
      userInfo: req.body.userInfo || {},
      ...getRequestContext(req),
    });

    return ok(res, toMiniProgramLoginPayload(data));
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @description 手机号验证码免密登录控制器
 * @param {import('express').Request} req HTTP 请求对象，需包含 phone, code
 * @param {import('express').Response} res HTTP 响应对象
 * @returns {Promise<void>} 免密登录成功并签发 Token
 */
async function loginPhoneByCode(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['phone', 'code']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) return fail(res, 400, phoneCheck.message, null, 400);

    const codeCheck = validateSmsCode(req.body.code);
    if (!codeCheck.valid) return fail(res, 400, codeCheck.message, null, 400);

    const data = await authService.loginPhoneByCode({
      phone: req.body.phone,
      code: req.body.code,
      ...getRequestContext(req),
    });

    return ok(res, toMiniProgramLoginPayload(data));
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * 请求密码重置
 */
async function requestPasswordReset(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['phone']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) return fail(res, 400, phoneCheck.message, null, 400);

    const data = await authService.requestPasswordReset(req.body.phone, getRequestContext(req));
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * 确认密码重置
 */
async function confirmPasswordReset(req, res) {
  try {
    const required = validateRequired(req.body || {}, ['phone', 'code', 'new_password']);
    if (!required.valid) return fail(res, 400, required.message, null, 400);

    const phoneCheck = validatePhone(req.body.phone);
    if (!phoneCheck.valid) return fail(res, 400, phoneCheck.message, null, 400);

    const codeCheck = validateSmsCode(req.body.code);
    if (!codeCheck.valid) return fail(res, 400, codeCheck.message, null, 400);

    const passwordCheck = validatePassword(req.body.new_password);
    if (!passwordCheck.valid) return fail(res, 400, passwordCheck.message, null, 400);

    const data = await authService.confirmPasswordReset({
      phone: req.body.phone,
      code: req.body.code,
      newPassword: req.body.new_password,
      ...getRequestContext(req),
    });

    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * 登出
 */
async function logout(req, res) {
  try {
    // 从 token 中获取用户信息
    const userId = req.user?.userId ?? req.userId;
    const sessionId = req.user?.sid ?? null;

    if (userId === undefined || userId === null) {
      return fail(res, 401, 'Not authenticated.', null, 401);
    }

    const data = await authService.logout(userId, sessionId, getRequestContext(req));
    return ok(res, data);
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  sendSms,
  registerPhone,
  loginPhone,
  adminLogin,
  refreshToken,
  loginWechat,
  loginWechatMiniProgram,
  loginPhoneByCode,
  requestPasswordReset,
  confirmPasswordReset,
  logout,
};