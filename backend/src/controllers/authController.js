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

const SMS_PURPOSES = new Set(['register', 'login', 'bind', 'reset_password']);

function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }
  return fail(res, 500, 'Internal server error.', null, 500);
}

function toMiniProgramLoginPayload(serviceData) {
  return {
    token: serviceData.access_token,
    userInfo: serviceData.user,
  };
}

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

module.exports = {
  sendSms,
  registerPhone,
  loginPhone,
  adminLogin,
  refreshToken,
  loginWechat,
  loginWechatMiniProgram,
  loginPhoneByCode,
};
