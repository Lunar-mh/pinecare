'use strict';

const { mergeProviderRuntime } = require('../../utils/providerRuntime');

function buildCapabilityReport(providerKey, strategy) {
  return mergeProviderRuntime(providerKey, {
    requestedMode: strategy.requestedMode,
    effectiveMode: strategy.effectiveMode,
    liveConfigured: strategy.liveConfigured,
    fallbackAllowed: strategy.fallbackAllowed,
    runtimeMode: strategy.runtimeMode,
  });
}

module.exports = {
  buildCapabilityReport,
};
