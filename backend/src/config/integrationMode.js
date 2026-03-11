'use strict';

const { isProductionLive, resolveMode } = require('./runtimeMode');

const SUPPORTED_MODES = new Set(['auto', 'live', 'stub', 'mock']);

function normalizeRequestedMode(raw, fallback = 'auto') {
  const normalized = String(raw || fallback)
    .trim()
    .toLowerCase();

  if (!SUPPORTED_MODES.has(normalized)) {
    return fallback;
  }

  return normalized;
}

function hasRequiredEnv(keys = []) {
  return keys.every((key) => Boolean(String(process.env[key] || '').trim()));
}

function resolveIntegrationMode({ requestedMode = 'auto', liveConfigured = false } = {}) {
  const normalizedMode = normalizeRequestedMode(requestedMode);
  const productionLive = isProductionLive();

  let effectiveMode = 'stub';
  if (normalizedMode === 'live') {
    effectiveMode = 'live';
  } else if (normalizedMode === 'stub' || normalizedMode === 'mock') {
    effectiveMode = 'stub';
  } else if (productionLive || liveConfigured) {
    effectiveMode = 'live';
  }

  const fallbackAllowed = !productionLive;
  const stubAllowed = effectiveMode === 'stub' && fallbackAllowed;

  return {
    requestedMode: normalizedMode,
    effectiveMode,
    liveConfigured: Boolean(liveConfigured),
    productionLive,
    fallbackAllowed,
    stubAllowed,
    runtimeMode: resolveMode(),
  };
}

module.exports = {
  normalizeRequestedMode,
  hasRequiredEnv,
  resolveIntegrationMode,
};
