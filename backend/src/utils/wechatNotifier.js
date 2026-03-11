'use strict';

const axios = require('axios');
const { query } = require('../config/database');
const { isCompetitionSandbox, isProductionLive } = require('../config/runtimeMode');
const { createUpstreamError, isRetryableError, logThirdPartyError } = require('./thirdParty');

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRY_TIMES = 2;

function createBizError(message, code = 502, statusCode = 502, data = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.data = data;
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'unknown time';
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return `${y}-${m}-${d} ${hh}:${mm}`;
}

async function findOpenIdByUserId(userId) {
  const [rows] = await query(
    `SELECT id, openid
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  const user = rows[0] || null;
  if (!user || !user.openid) {
    throw createBizError('User does not have a bound wechat openid.', 400, 400);
  }

  return String(user.openid);
}

function resolveTemplateId(type) {
  if (type === 'family') {
    return process.env.WX_MSG_TEMPLATE_ID_FAMILY || process.env.WX_MSG_TEMPLATE_ID || '';
  }
  if (type === 'refill') {
    return process.env.WX_MSG_TEMPLATE_ID_REFILL || process.env.WX_MSG_TEMPLATE_ID || '';
  }
  if (type === 'second') {
    return process.env.WX_MSG_TEMPLATE_ID_SECOND || process.env.WX_MSG_TEMPLATE_ID || '';
  }

  return process.env.WX_MSG_TEMPLATE_ID || '';
}

function buildApiUrl() {
  const baseUrl =
    process.env.WECHAT_NOTIFY_API_URL || 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send';
  const accessToken = process.env.WX_ACCESS_TOKEN || '';

  if (!accessToken) {
    return null;
  }

  return `${baseUrl}?access_token=${encodeURIComponent(accessToken)}`;
}

function toWechatError(err) {
  return createUpstreamError(err, {
    timeout: 'WeChat notify timeout.',
    rateLimited: 'WeChat notify rate limited.',
    unavailable: 'WeChat notify service unavailable.',
    failed: 'WeChat notify request failed.',
  });
}

function normalizeWechatApiError(data) {
  const errCode = Number(data && data.errcode);
  const errMsg = String((data && data.errmsg) || 'wechat api error');

  if (errCode === -1 || errCode === 45009) {
    return createBizError(`wechat rate limit: ${errMsg}`, 503, 503, data);
  }

  if (errCode === 40001 || errCode === 42001) {
    return createBizError(`wechat access token invalid: ${errMsg}`, 502, 502, data);
  }

  return createBizError(`wechat notify failed: ${errMsg}`, 502, 502, data);
}

function isRetryableWechatError(err) {
  if (isRetryableError(err)) return true;

  if (err && err.response && err.response.data) {
    const errCode = Number(err.response.data.errcode);
    return errCode === -1 || errCode === 45009;
  }

  if (err && err.code && err.statusCode) {
    return err.code === 503 || err.statusCode === 503;
  }

  return ['ECONNABORTED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(err && err.code);
}

async function requestWithRetry(payload, retryTimes, type) {
  const apiUrl = buildApiUrl();
  const mockEnabledByEnv = process.env.WECHAT_NOTIFY_MOCK === '1';
  const allowMock = isCompetitionSandbox();

  if (!apiUrl || mockEnabledByEnv) {
    if (!allowMock || isProductionLive()) {
      throw createBizError('WeChat notify config is missing in PRODUCTION_LIVE mode.', 503, 503);
    }

    return {
      errcode: 0,
      errmsg: 'mock success',
      msgid: `mock-${Date.now()}`,
      mock: true,
    };
  }

  let lastError = null;
  const maxRetries = Number.isInteger(retryTimes) ? retryTimes : DEFAULT_RETRY_TIMES;

  for (let i = 0; i <= maxRetries; i += 1) {
    try {
      const response = await axios.post(apiUrl, payload, {
        timeout: Number(process.env.WECHAT_NOTIFY_TIMEOUT || DEFAULT_TIMEOUT),
      });

      const data = response.data || {};
      if (Number(data.errcode || 0) !== 0) {
        throw normalizeWechatApiError(data);
      }

      return data;
    } catch (err) {
      lastError = err;
      logThirdPartyError('wechat-notify', err, {
        type,
        attempt: i + 1,
      });

      if (i < maxRetries && isRetryableWechatError(err)) {
        await sleep(100 * (i + 1));
        continue;
      }
      break;
    }
  }

  if (lastError && lastError.code && lastError.statusCode) {
    throw lastError;
  }

  throw toWechatError(lastError);
}

async function sendTemplateByOpenId(options) {
  const templateId = resolveTemplateId(options.type);
  if (!templateId) {
    if (isProductionLive()) {
      throw createBizError('WeChat template id is required in PRODUCTION_LIVE mode.', 503, 503);
    }

    return {
      msgid: `mock-${Date.now()}`,
      mock: true,
    };
  }

  const payload = {
    touser: options.openid,
    template_id: templateId,
    page: options.page || 'pages/medication/index',
    data: options.data || {},
    miniprogram_state: process.env.WECHAT_MINI_PROGRAM_STATE || 'formal',
    lang: 'zh_CN',
  };

  const result = await requestWithRetry(payload, DEFAULT_RETRY_TIMES, options.type);

  return {
    msgid: result.msgid || null,
    mock: Boolean(result.mock),
  };
}

const wechatNotifier = {
  async sendMedicationReminder(params) {
    const openid = await findOpenIdByUserId(params.userId);

    return sendTemplateByOpenId({
      openid,
      type: params.remindType === 'second' ? 'second' : 'first',
      data: {
        thing1: { value: String(params.medicationName || 'medication reminder').slice(0, 20) },
        thing2: { value: String(params.dosage || '').slice(0, 20) },
        time3: { value: formatDateTime(params.scheduledTime) },
        thing4: { value: String(params.remark || 'please take medicine on time').slice(0, 20) },
      },
    });
  },

  async sendFamilyMissedReminder(params) {
    const openid = await findOpenIdByUserId(params.familyUserId);

    return sendTemplateByOpenId({
      openid,
      type: 'family',
      data: {
        thing1: { value: String(params.medicationName || 'medication reminder').slice(0, 20) },
        time2: { value: formatDateTime(params.scheduledTime) },
        thing3: { value: 'elder did not confirm medication in 2 hours'.slice(0, 20) },
      },
    });
  },

  async sendRefillReminder(params) {
    const openid = await findOpenIdByUserId(params.userId);

    return sendTemplateByOpenId({
      openid,
      type: 'refill',
      data: {
        thing1: { value: String(params.medicationName || 'medicine').slice(0, 20) },
        thing2: {
          value:
            `remaining ${params.remainingQuantity}, threshold ${params.reminderThreshold}`.slice(
              0,
              20
            ),
        },
        thing3: { value: 'please refill medicine in time'.slice(0, 20) },
      },
    });
  },
};

module.exports = wechatNotifier;
