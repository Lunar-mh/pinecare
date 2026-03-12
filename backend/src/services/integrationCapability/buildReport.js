'use strict';

const { mergeProviderRuntime } = require('../../utils/providerRuntime');

function buildCapabilityReport(providerKey, strategy, extra = {}) {
  return mergeProviderRuntime(providerKey, {
    requestedMode: strategy.requestedMode,
    effectiveMode: strategy.effectiveMode,
    liveConfigured: strategy.liveConfigured,
    fallbackAllowed:
      extra.fallbackAllowed !== undefined ? extra.fallbackAllowed : strategy.fallbackAllowed,
    runtimeMode: strategy.runtimeMode,
    ...extra,
  });
}

module.exports = {
  buildCapabilityReport,
};
