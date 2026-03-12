'use strict';

const { getRecentThirdPartyErrors } = require('./thirdParty');

const providerSuccessState = new Map();

function sanitizeDetails(details) {
  if (!details || typeof details !== 'object') {
    return details || null;
  }

  return JSON.parse(JSON.stringify(details));
}

function recordProviderSuccess(provider, details = {}) {
  const key = String(provider || '').trim();
  if (!key) {
    return null;
  }

  const current = providerSuccessState.get(key) || {
    provider: key,
    successCount: 0,
  };

  const next = {
    ...current,
    provider: key,
    lastSuccessAt: new Date().toISOString(),
    lastSuccess: sanitizeDetails(details),
    successCount: Number(current.successCount || 0) + 1,
    lastOutcome: 'success',
  };

  providerSuccessState.set(key, next);
  return { ...next };
}

function findLatestProviderError(provider) {
  return getRecentThirdPartyErrors(50).find((item) => item && item.provider === provider) || null;
}

function getProviderRuntime(provider) {
  const key = String(provider || '').trim();
  const success = providerSuccessState.get(key) || {
    provider: key,
    successCount: 0,
    lastSuccessAt: null,
    lastSuccess: null,
    lastOutcome: null,
  };
  const latestError = findLatestProviderError(key);
  const errorCount = getRecentThirdPartyErrors(50).filter((item) => item && item.provider === key).length;

  return {
    provider: key,
    lastSuccessAt: success.lastSuccessAt || null,
    lastSuccess: success.lastSuccess || null,
    successCount: Number(success.successCount || 0),
    lastErrorAt: latestError ? latestError.timestamp : null,
    lastError: latestError
      ? {
          code: latestError.code,
          status: latestError.status,
          message: latestError.message,
          extra: latestError.extra,
        }
      : null,
    errorCount,
    lastOutcome:
      success.lastOutcome === 'success'
        ? 'success'
        : latestError
          ? 'error'
          : null,
  };
}

function mergeProviderRuntime(provider, payload = {}) {
  const runtime = getProviderRuntime(provider);
  return {
    ...payload,
    runtimeProvider: runtime.provider,
    provider: payload.provider || runtime.provider,
    lastSuccessAt: runtime.lastSuccessAt,
    lastSuccess: runtime.lastSuccess,
    successCount: runtime.successCount,
    lastErrorAt: runtime.lastErrorAt,
    lastError: runtime.lastError,
    errorCount: runtime.errorCount,
    lastOutcome: runtime.lastOutcome,
  };
}

function listProviderRuntime(providers = []) {
  return providers.map((provider) => getProviderRuntime(provider));
}

function clearProviderRuntimeStatuses() {
  providerSuccessState.clear();
}

module.exports = {
  recordProviderSuccess,
  getProviderRuntime,
  mergeProviderRuntime,
  listProviderRuntime,
  clearProviderRuntimeStatuses,
};