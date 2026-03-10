'use strict';

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sanitizeText(input) {
  return String(input || '')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/(api[_-]?key|access[_-]?key|secret|token)=([^\s&]+)/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s)]+/gi, '[REDACTED_URL]');
}

function sanitizeObject(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeObject(item));

  const out = {};
  Object.keys(value).forEach((key) => {
    const lower = key.toLowerCase();
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
    out[key] = sanitizeObject(value[key]);
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
    provider,
    code: err && err.code ? err.code : undefined,
    status: err && err.response ? err.response.status : undefined,
    message: sanitizeText(err && err.message ? err.message : ''),
    response: sanitizeObject(err && err.response ? err.response.data : undefined),
    extra: sanitizeObject(extra),
  };
  console.error('third_party_error', payload);
}

module.exports = {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
  sanitizeObject,
  sanitizeText,
};
