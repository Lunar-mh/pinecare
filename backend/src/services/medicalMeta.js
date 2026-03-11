'use strict';

function inferMode(service, source) {
  if (service && typeof service.getModeTag === 'function') {
    return service.getModeTag();
  }

  if (source === 'third_party_live') {
    return 'live';
  }

  return 'stub';
}

function inferCapability(service, source, mode) {
  if (service && typeof service.getCapabilityReport === 'function') {
    return service.getCapabilityReport();
  }

  const baseURL = String(process.env.MEDICAL_API_BASE_URL || '').trim();
  const apiKey = String(process.env.MEDICAL_API_KEY || '').trim();
  const liveConfigured = Boolean(baseURL) && Boolean(apiKey);
  const missingConfig = [];

  if (!baseURL) missingConfig.push('MEDICAL_API_BASE_URL');
  if (!apiKey) missingConfig.push('MEDICAL_API_KEY');

  return {
    source: source || 'third_party_stub',
    mode,
    effectiveMode: mode,
    liveConfigured,
    fallbackAllowed:
      String(process.env.MEDICAL_API_ALLOW_STUB_FALLBACK || 'false').toLowerCase() === 'true',
    circuitOpen: false,
    missingConfig,
  };
}

function createMedicalMeta(service, operation, options = {}) {
  const source =
    options.source ||
    (service && typeof service.getSourceTag === 'function'
      ? service.getSourceTag()
      : 'third_party_stub');
  const mode = options.mode || inferMode(service, source);
  const fallbackUsed = Boolean(options.fallbackUsed);
  const diagnosticId = `${String(operation || 'medical').replace(/[^a-zA-Z0-9]+/g, '_')}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const capability = inferCapability(service, source, mode);
  const requestedMode = capability.mode || mode;
  const effectiveMode = capability.effectiveMode || mode;
  const missingConfig = Array.isArray(capability.missingConfig) ? capability.missingConfig : [];

  return {
    source,
    mode: effectiveMode,
    fallbackUsed,
    diagnosticId,
    diagnostics: {
      operation,
      source,
      mode: effectiveMode,
      requestedMode,
      effectiveMode,
      fallbackUsed,
      reason: options.reason || 'ok',
      liveConfigured: Boolean(capability.liveConfigured),
      fallbackAllowed: Boolean(capability.fallbackAllowed),
      circuitOpen: Boolean(capability.circuitOpen),
      missingConfig,
      configState: capability.liveConfigured ? 'ready' : 'missing',
      generatedAt: new Date().toISOString(),
      detail: options.detail || null,
    },
  };
}

module.exports = {
  createMedicalMeta,
};
