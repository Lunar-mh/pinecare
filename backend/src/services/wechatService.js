'use strict';

const axios = require('axios');

function createBusinessError(code, message, data = null, httpStatus = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = httpStatus || code;
  err.data = data;
  return err;
}

async function code2Session(code) {
  try {
    const response = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WX_APPID,
        secret: process.env.WX_APPSECRET,
        js_code: code,
        grant_type: 'authorization_code',
      },
      timeout: 5000,
    });

    const data = response.data || {};
    if (data.errcode) {
      throw createBusinessError(400, data.errmsg || '微信登录失败', {
        wechat_errcode: data.errcode,
      }, 400);
    }

    if (!data.openid) {
      throw createBusinessError(400, '微信返回缺少 openid', null, 400);
    }

    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid || null,
    };
  } catch (err) {
    if (err.code && err.statusCode) {
      throw err;
    }

    throw createBusinessError(502, '微信服务调用失败，请稍后重试', {
      detail: err.message,
    }, 502);
  }
}

module.exports = {
  code2Session,
};
