'use strict';

const axios = require('axios');
const { createBusinessError } = require('../utils/serviceError');

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
      throw createBusinessError(400, data.errmsg || 'WeChat login failed.', {
        wechat_errcode: data.errcode,
      }, 400);
    }

    if (!data.openid) {
      throw createBusinessError(400, 'WeChat response missing openid.', null, 400);
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

    throw createBusinessError(502, 'WeChat service request failed, please retry later.', {
      detail: err.message,
    }, 502);
  }
}

module.exports = {
  code2Session,
};
