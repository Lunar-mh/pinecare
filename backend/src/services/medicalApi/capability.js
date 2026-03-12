'use strict';

const { resolveIntegrationMode } = require('../../config/integrationMode');
const {
  CIRCUIT_BREAKER_COOLDOWN_MS,
  CIRCUIT_BREAKER_THRESHOLD,
  MAX_RETRY,
  createBizError,
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
  sleep,
  writeAudit,
} = require('./shared');
const { recordProviderSuccess } = require('../../utils/providerRuntime');
const { buildCapabilityReport } = require('../integrationCapability/buildReport');

function hasLiveConfig(service) {
  return Boolean(service.baseURL) && Boolean(service.apiKey);
}

function getModeStrategy(service) {
  return resolveIntegrationMode({
    requestedMode: service.mode,
    liveConfigured: hasLiveConfig(service),
  });
}

function isLiveMode(service) {
  return getModeStrategy(service).effectiveMode === 'live';
}

function getSourceTag(service) {
  return isLiveMode(service) ? 'third_party_live' : 'third_party_stub';
}

function getModeTag(service) {
  return getModeStrategy(service).effectiveMode;
}

function getCapabilityReport(service) {
  const strategy = getModeStrategy(service);
  const missingConfig = [];
  if (!String(service.baseURL || '').trim()) missingConfig.push('MEDICAL_API_BASE_URL');
  if (!String(service.apiKey || '').trim()) missingConfig.push('MEDICAL_API_KEY');

  return buildCapabilityReport('medical-api', strategy, {
    source: getSourceTag(service),
    mode: strategy.requestedMode,
    fallbackAllowed: strategy.fallbackAllowed && service.allowStubFallback,
    circuitOpen: isCircuitOpen(service),
    missingConfig,
  });
}

function toUpstreamError(err) {
  return createUpstreamError(err, {
    timeout: 'Third-party medical service timeout.',
    rateLimited: 'Third-party medical service rate limited.',
    unavailable: 'Third-party medical service unavailable.',
    failed: 'Third-party medical service request failed.',
  });
}

function isCircuitOpen(service) {
  if (!service.circuitOpenedAt) {
    return false;
  }

  const elapsed = Date.now() - service.circuitOpenedAt;
  if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
    service.failureCount = 0;
    service.circuitOpenedAt = 0;
    return false;
  }

  return true;
}

function recordSuccess(service) {
  service.failureCount = 0;
  service.circuitOpenedAt = 0;
}

function recordFailure(service) {
  service.failureCount += 1;
  if (service.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    service.circuitOpenedAt = Date.now();
  }
}

function createCircuitOpenError() {
  return createBizError(503, 'Medical API circuit breaker is open.', 503);
}

async function requestWithRetry(service, operation, requestFactory) {
  if (isCircuitOpen(service)) {
    throw createCircuitOpenError();
  }

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      const response = await requestFactory(service.client);
      recordSuccess(service);
      recordProviderSuccess('medical-api', {
        operation,
        mode: 'live',
      });
      return response;
    } catch (err) {
      lastError = err;
      recordFailure(service);
      logThirdPartyError('medical-api', err, { operation, attempt: attempt + 1 });

      if (!isRetryableError(err) || attempt >= MAX_RETRY) {
        const upstreamError = toUpstreamError(err);
        await writeAudit('medical.upstream.failure', {
          operation,
          mode: 'live',
          code: upstreamError.code,
          status_code: upstreamError.statusCode,
          message: upstreamError.message,
          attempt: attempt + 1,
        });
        throw upstreamError;
      }

      await sleep(100 * (attempt + 1));
    }
  }

  throw toUpstreamError(lastError);
}

async function execute(service, operation, stubFactory, liveFactory) {
  const strategy = getModeStrategy(service);

  if (strategy.effectiveMode !== 'live') {
    if (!strategy.stubAllowed) {
      throw createBizError(503, 'Medical API stub mode is disabled in PRODUCTION_LIVE mode.', 503);
    }
    return stubFactory();
  }

  if (!hasLiveConfig(service)) {
    throw createBizError(503, 'Medical API live mode is missing configuration.', 503);
  }

  try {
    return await liveFactory();
  } catch (err) {
    if (service.allowStubFallback && strategy.fallbackAllowed) {
      logThirdPartyError('medical-api', err, {
        operation,
        fallback: 'stub',
      });
      await writeAudit('medical.upstream.fallback', {
        operation,
        mode: 'live',
        fallback: 'stub',
        source: getSourceTag(service),
      });
      return stubFactory();
    }
    throw err;
  }
}

module.exports = {
  execute,
  getCapabilityReport,
  getModeStrategy,
  getModeTag,
  getSourceTag,
  hasLiveConfig,
  isCircuitOpen,
  isLiveMode,
  requestWithRetry,
};

