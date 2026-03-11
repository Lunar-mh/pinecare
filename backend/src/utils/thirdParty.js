'use strict';

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RECENT_ERROR_LIMIT = 20;
const recentThirdPartyErrors = [];

function maskWithEdges(value, keepStart, keepEnd) {
  const raw = String(value || '');
  if (!raw) return raw;

  const start = Math.max(0, Number(keepStart) || 0);
  const end = Math.max(0, Number(keepEnd) || 0);
  if (raw.length <= start + end) {
    return '*'.repeat(Math.max(1, raw.length));
  }

  const stars = '*'.repeat(raw.length - start - end);
  return `${raw.slice(0, start)}${stars}${raw.slice(raw.length - end)}`;
}

function maskPhone(value) {
  const raw = String(value || '').trim();
  if (!/^1\d{10}$/.test(raw)) return raw;
  return `${raw.slice(0, 3)}****${raw.slice(7)}`;
}

function maskIdCard(value) {
  const raw = String(value || '').trim();
  if (!/^(\d{15}|\d{17}[\dXx])$/.test(raw)) return raw;
  return maskWithEdges(raw, 3, 2);
}

function sanitizeText(input) {
  return String(input || '')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|access[_-]?key|secret|token)=([^\s&]+)/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s)]+/gi, '[REDACTED_URL]')
    .replace(/\b1\d{10}\b/g, (matched) => maskPhone(matched))
    .replace(/\b\d{17}[\dXx]\b/g, (matched) => maskIdCard(matched))
    .replace(/\b\d{15}\b/g, (matched) => maskIdCard(matched));
}

function sanitizeObject(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeObject(item));

  const out = {};
  Object.keys(value).forEach((key) => {
    const lower = key.toLowerCase();
    const itemValue = value[key];

    if (
      lower.includes('token') ||
      lower.includes('secret') ||
      lower.includes('api_key') ||
      lower.includes('apikey') ||
      lower.includes('accesskey') ||
      lower.includes('authorization')
    ) {
      out[key] = '[REDACTED]';
      return;
    }

    if (
      lower.includes('idcard') ||
      lower.includes('id_card') ||
      lower.includes('identity_card') ||
      lower.includes('cert_no')
    ) {
      out[key] = maskIdCard(itemValue);
      return;
    }

    if (lower.includes('phone') || lower.includes('mobile')) {
      out[key] = maskPhone(itemValue);
      return;
    }

    out[key] = sanitizeObject(itemValue);
  });
  return out;
}

function createUpstreamError(err, messages = {}) {
  const timeoutMessage = messages.timeout || 'Third-party request timeout.';
  const rateLimitMessage = messages.rateLimited || 'Third-party service rate limited.';
  const unavailableMessage = messages.unavailable || 'Third-party service unavailable.';
  const failedMessage = messages.failed || 'Third-party request failed.';

  const bizError = new Error(failedMessage);
  bizError.code = 503;
  bizError.statusCode = 503;

  const status = Number(err && err.response && err.response.status);
  if (err && err.code === 'ECONNABORTED') {
    bizError.message = timeoutMessage;
    bizError.code = 504;
    bizError.statusCode = 504;
    return bizError;
  }

  if (status === 429) {
    bizError.message = rateLimitMessage;
    return bizError;
  }

  if (status >= 500) {
    bizError.message = unavailableMessage;
    return bizError;
  }

  return bizError;
}

function isRetryableError(err) {
  if (!err) return false;
  if (err.code === 'ECONNABORTED') return true;
  const status = Number(err.response && err.response.status);
  return RETRYABLE_STATUS_CODES.has(status);
}

function logThirdPartyError(provider, err, extra = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    provider,
    code: err && err.code ? err.code : undefined,
    status: err && err.response ? err.response.status : undefined,
    message: sanitizeText(err && err.message ? err.message : ''),
    response: sanitizeObject(err && err.response ? err.response.data : undefined),
    extra: sanitizeObject(extra),
  };

  recentThirdPartyErrors.unshift(payload);
  if (recentThirdPartyErrors.length > RECENT_ERROR_LIMIT) {
    recentThirdPartyErrors.length = RECENT_ERROR_LIMIT;
  }

  console.error('third_party_error', payload);
}

function getRecentThirdPartyErrors(limit = 10) {
  return recentThirdPartyErrors.slice(0, Math.max(0, Number(limit) || 0));
}

function clearRecentThirdPartyErrors() {
  recentThirdPartyErrors.length = 0;
}

module.exports = {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
  getRecentThirdPartyErrors,
  clearRecentThirdPartyErrors,
  sanitizeObject,
  sanitizeText,
  maskPhone,
  maskIdCard,
};


