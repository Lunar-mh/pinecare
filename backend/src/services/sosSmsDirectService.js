'use strict';

const axios = require('axios');
const crypto = require('crypto');
const { resolveIntegrationMode } = require('../config/integrationMode');
const { createUpstreamError, isRetryableError, logThirdPartyError } = require('../utils/thirdParty');
const { mergeProviderRuntime, recordProviderSuccess } = require('../utils/providerRuntime');

const DEFAULT_TIMEOUT_MS = Number(process.env.SOS_SMS_TIMEOUT_MS || 5000);
const MAX_RETRY = Math.max(0, Number(process.env.SOS_NOTIFY_MAX_RETRY || 2));
const DEFAULT_ENDPOINT = 'https://dysmsapi.aliyuncs.com/';

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

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmacSha256Hex(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function getRequestedMode() {
  return String(process.env.SOS_SMS_MODE || 'auto').trim().toLowerCase();
}

function getTemplateCode() {
  return String(process.env.SOS_SMS_TEMPLATE_CODE || process.env.ALIYUN_SMS_TEMPLATE_CODE || '').trim();
}

function getSignName() {
  return String(process.env.SOS_SMS_SIGN_NAME || process.env.ALIYUN_SMS_SIGN_NAME || '').trim();
}

function hasLiveConfig() {
  return Boolean(String(process.env.ALIYUN_ACCESS_KEY_ID || '').trim()) &&
    Boolean(String(process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim()) &&
    Boolean(getSignName()) &&
    Boolean(getTemplateCode());
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

  if (!String(process.env.ALIYUN_ACCESS_KEY_ID || '').trim()) missingConfig.push('ALIYUN_ACCESS_KEY_ID');
  if (!String(process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim()) missingConfig.push('ALIYUN_ACCESS_KEY_SECRET');
  if (!getSignName()) missingConfig.push('SOS_SMS_SIGN_NAME|ALIYUN_SMS_SIGN_NAME');
  if (!getTemplateCode()) missingConfig.push('SOS_SMS_TEMPLATE_CODE|ALIYUN_SMS_TEMPLATE_CODE');

  return {
    provider: 'aliyun_sms',
    requestedMode: strategy.requestedMode,
    effectiveMode: strategy.effectiveMode,
    liveConfigured: strategy.liveConfigured,
    fallbackAllowed: strategy.fallbackAllowed,
    runtimeMode: strategy.runtimeMode,
    missingConfig,
  };
}

function buildCanonicalQuery(params) {
  return Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
}

function buildAuthorizationHeaders({ method, host, canonicalQueryString, action, version, accessKeyId, accessKeySecret }) {
  const nonce = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
  const date = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const payloadHash = sha256Hex('');
  const canonicalHeaders = [
    `host:${host}`,
    `x-acs-action:${action}`,
    `x-acs-content-sha256:${payloadHash}`,
    `x-acs-date:${date}`,
    `x-acs-signature-nonce:${nonce}`,
    `x-acs-version:${version}`,
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-acs-action;x-acs-content-sha256;x-acs-date;x-acs-signature-nonce;x-acs-version';
  const canonicalRequest = [method, '/', canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = `ACS3-HMAC-SHA256\n${sha256Hex(canonicalRequest)}`;
  const signature = hmacSha256Hex(accessKeySecret, stringToSign);

  return {
    authorization: `ACS3-HMAC-SHA256 Credential=${accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`,
    nonce,
    date,
    payloadHash,
  };
}

function buildRequestConfig(payload) {
  const accessKeyId = String(process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = String(process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();
  const action = 'SendSms';
  const version = '2017-05-25';
  const endpoint = String(process.env.SOS_SMS_API_URL || DEFAULT_ENDPOINT).trim() || DEFAULT_ENDPOINT;
  const url = new URL(endpoint);

  const queryParams = {
    PhoneNumbers: String(payload.phone || '').trim(),
    SignName: getSignName(),
    TemplateCode: getTemplateCode(),
    TemplateParam: JSON.stringify({
      event_id: String(payload.event_id || ''),
      contact_name: String(payload.contact_name || ''),
      address: String(payload.address || 'unknown address'),
      latitude: payload.latitude === undefined || payload.latitude === null ? '' : String(payload.latitude),
      longitude: payload.longitude === undefined || payload.longitude === null ? '' : String(payload.longitude),
      triggered_at: String(payload.triggered_at || ''),
    }),
    RegionId: String(process.env.SOS_SMS_REGION_ID || 'cn-hangzhou').trim(),
  };

  const canonicalQueryString = buildCanonicalQuery(queryParams);
  const auth = buildAuthorizationHeaders({
    method: 'GET',
    host: url.host,
    canonicalQueryString,
    action,
    version,
    accessKeyId,
    accessKeySecret,
  });

  return {
    fullUrl: `${url.origin}/?${canonicalQueryString}`,
    headers: {
      host: url.host,
      'x-acs-action': action,
      'x-acs-version': version,
      'x-acs-date': auth.date,
      'x-acs-signature-nonce': auth.nonce,
      'x-acs-content-sha256': auth.payloadHash,
      Authorization: auth.authorization,
    },
  };
}

function toSmsError(err) {
  return createUpstreamError(err, {
    timeout: 'SOS SMS timeout.',
    rateLimited: 'SOS SMS rate limited.',
    unavailable: 'SOS SMS service unavailable.',
    failed: 'SOS SMS failed.',
  });
}

function normalizeApiError(data) {
  const code = String((data && data.Code) || 'SMS_API_ERROR');
  const message = String((data && data.Message) || 'SOS SMS failed.');

  if (code === 'isv.BUSINESS_LIMIT_CONTROL') {
    return createBizError(`SOS SMS rate limited: ${message}`, 503, 503, data);
  }

  return createBizError(`SOS SMS failed: ${message}`, 502, 502, data);
}

async function requestWithRetry(payload) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      const config = buildRequestConfig(payload);
      const response = await axios.get(config.fullUrl, {
        headers: config.headers,
        timeout: DEFAULT_TIMEOUT_MS,
      });

      const data = response.data || {};
      if (String(data.Code || '') !== 'OK') {
        throw normalizeApiError(data);
      }

      return {
        provider: 'aliyun_sms',
        code: data.Code,
        message: data.Message,
        bizId: data.BizId || null,
        requestId: data.RequestId || null,
      };
    } catch (err) {
      lastError = err;
      logThirdPartyError('sos-sms-direct', err, {
        attempt: attempt + 1,
        phone: payload.phone,
      });

      const retryable = isRetryableError(err) || (err && err.code === 503);
      if (!retryable || attempt >= MAX_RETRY) {
        if (err && err.code && err.statusCode) {
          throw err;
        }
        throw toSmsError(err);
      }

      await sleep(100 * (attempt + 1));
    }
  }

  throw toSmsError(lastError);
}

async function sendSosSms(payload) {
  if (!payload || !String(payload.phone || '').trim()) {
    throw createBizError('SOS SMS phone is required.', 400, 400);
  }

  const strategy = getModeStrategy();
  if (strategy.effectiveMode !== 'live') {
    if (!strategy.stubAllowed) {
      throw createBizError('SOS SMS stub mode is disabled in PRODUCTION_LIVE mode.', 503, 503);
    }

    return {
      provider: 'aliyun_sms',
      mock: true,
      bizId: `mock-${Date.now()}`,
      requestId: `mock-${Date.now()}`,
    };
  }

  if (!hasLiveConfig()) {
    throw createBizError('SOS SMS live mode is missing configuration.', 503, 503);
  }

  return requestWithRetry(payload);
}

module.exports = {
  sendSosSms,
  getCapabilityReport,
};

