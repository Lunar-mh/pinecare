'use strict';

const axios = require('axios');
const { resolveIntegrationMode } = require('../config/integrationMode');
const { createUpstreamError, isRetryableError, logThirdPartyError } = require('../utils/thirdParty');
const { mergeProviderRuntime, recordProviderSuccess } = require('../utils/providerRuntime');

const DEFAULT_TIMEOUT_MS = Number(process.env.SOS_WECHAT_TIMEOUT_MS || 5000);
const MAX_RETRY = Math.max(0, Number(process.env.SOS_NOTIFY_MAX_RETRY || 2));

function createBizError(message, code = 503, statusCode = 503, data = null) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.data = data;
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateText(value, length = 20) {
  return String(value || '').trim().slice(0, length);
}

function getRequestedMode() {
  return String(process.env.SOS_WECHAT_MODE || process.env.WECHAT_NOTIFY_MODE || 'auto')
    .trim()
    .toLowerCase();
}

function getTemplateId() {
  return String(process.env.SOS_WX_MSG_TEMPLATE_ID || process.env.WX_MSG_TEMPLATE_ID_FAMILY || process.env.WX_MSG_TEMPLATE_ID || '').trim();
}

function hasLiveConfig() {
  return Boolean(String(process.env.WX_ACCESS_TOKEN || '').trim()) && Boolean(getTemplateId());
}

function getModeStrategy() {
  return resolveIntegrationMode({
    requestedMode: getRequestedMode(),
    liveConfigured: hasLiveConfig(),
  });
}

function getCapabilityReport() {
  const strategy = getModeStrategy();
  const missingConfig = [];

  if (!String(process.env.WX_ACCESS_TOKEN || '').trim()) missingConfig.push('WX_ACCESS_TOKEN');
  if (!getTemplateId()) missingConfig.push('SOS_WX_MSG_TEMPLATE_ID|WX_MSG_TEMPLATE_ID_FAMILY|WX_MSG_TEMPLATE_ID');

  return {
    provider: 'wechat_subscribe_message',
    requestedMode: strategy.requestedMode,
    effectiveMode: strategy.effectiveMode,
    liveConfigured: strategy.liveConfigured,
    fallbackAllowed: strategy.fallbackAllowed,
    runtimeMode: strategy.runtimeMode,
    missingConfig,
  };
}

function buildApiUrl() {
  const baseUrl = String(process.env.WECHAT_NOTIFY_API_URL || 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send').trim();
  const accessToken = String(process.env.WX_ACCESS_TOKEN || '').trim();
  if (!accessToken) {
    return null;
  }
  return `${baseUrl}?access_token=${encodeURIComponent(accessToken)}`;
}

function buildTemplateData(payload) {
  const fieldContact = String(process.env.SOS_WX_FIELD_CONTACT || 'thing1').trim();
  const fieldAddress = String(process.env.SOS_WX_FIELD_ADDRESS || 'thing2').trim();
  const fieldTime = String(process.env.SOS_WX_FIELD_TIME || 'time3').trim();
  const fieldCoords = String(process.env.SOS_WX_FIELD_COORDS || 'thing4').trim();

  return {
    [fieldContact]: { value: truncateText(payload.contact_name || 'Emergency contact') },
    [fieldAddress]: { value: truncateText(payload.address || 'unknown address') },
    [fieldTime]: { value: truncateText(payload.triggered_at || new Date().toISOString(), 32) },
    [fieldCoords]: {
      value: truncateText(`${payload.latitude || '-'},${payload.longitude || '-'}`, 32),
    },
  };
}

function toWechatError(err) {
  return createUpstreamError(err, {
    timeout: 'SOS WeChat notify timeout.',
    rateLimited: 'SOS WeChat notify rate limited.',
    unavailable: 'SOS WeChat notify service unavailable.',
    failed: 'SOS WeChat notify failed.',
  });
}

function normalizeWechatApiError(data) {
  const errCode = Number(data && data.errcode);
  const errMsg = String((data && data.errmsg) || 'wechat api error');

  if (errCode === -1 || errCode === 45009) {
    return createBizError(`SOS WeChat notify rate limited: ${errMsg}`, 503, 503, data);
  }

  if (errCode === 40001 || errCode === 42001) {
    return createBizError(`SOS WeChat access token invalid: ${errMsg}`, 502, 502, data);
  }

  return createBizError(`SOS WeChat notify failed: ${errMsg}`, 502, 502, data);
}

async function requestWithRetry(payload) {
  const apiUrl = buildApiUrl();
  if (!apiUrl) {
    throw createBizError('SOS WeChat live mode requires WX_ACCESS_TOKEN.', 503, 503);
  }

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      const response = await axios.post(apiUrl, payload, {
        timeout: DEFAULT_TIMEOUT_MS,
      });
      const data = response.data || {};
      if (Number(data.errcode || 0) !== 0) {
        throw normalizeWechatApiError(data);
      }
      return {
        provider: 'wechat_subscribe_message',
        msgid: data.msgid || null,
        requestId: data.requestId || null,
      };
    } catch (err) {
      lastError = err;
      logThirdPartyError('sos-wechat-direct', err, {
        attempt: attempt + 1,
        openId: payload.touser,
      });

      const retryable = isRetryableError(err) || (err && err.code === 503);
      if (!retryable || attempt >= MAX_RETRY) {
        if (err && err.code && err.statusCode) {
          throw err;
        }
        throw toWechatError(err);
      }

      await sleep(100 * (attempt + 1));
    }
  }

  throw toWechatError(lastError);
}

async function sendSosWechat(payload) {
  if (!payload || !String(payload.open_id || payload.openId || '').trim()) {
    throw createBizError('SOS WeChat open_id is required.', 400, 400);
  }

  const strategy = getModeStrategy();
  if (strategy.effectiveMode !== 'live') {
    if (!strategy.stubAllowed) {
      throw createBizError('SOS WeChat stub mode is disabled in PRODUCTION_LIVE mode.', 503, 503);
    }

    return {
      provider: 'wechat_subscribe_message',
      mock: true,
      msgid: `mock-${Date.now()}`,
    };
  }

  if (!hasLiveConfig()) {
    throw createBizError('SOS WeChat live mode is missing configuration.', 503, 503);
  }

  return requestWithRetry({
    touser: String(payload.open_id || payload.openId).trim(),
    template_id: getTemplateId(),
    page: String(process.env.SOS_WECHAT_PAGE || 'pages/sos/index').trim(),
    data: buildTemplateData(payload),
    miniprogram_state: process.env.WECHAT_MINI_PROGRAM_STATE || 'formal',
    lang: 'zh_CN',
  });
}

module.exports = {
  sendSosWechat,
  getCapabilityReport,
};

