'use strict';

function sanitizeEvidenceValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeEvidenceValue(item))
      .filter((item) => item !== null)
      .slice(0, 10);
  }

  if (typeof value === 'object') {
    const preferredKeys = [
      'provider',
      'operation',
      'mode',
      'requestId',
      'taskId',
      'thirdPartyAppointId',
      'thirdPartySessionId',
      'bizId',
      'msgid',
      'objectKey',
      'key',
      'bucket',
      'reportCount',
      'count',
      'total',
      'doctorId',
      'hospitalId',
      'departmentId',
      'transcriptLength',
      'audioBytes',
      'hasUrl',
    ];
    const next = {};

    preferredKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const sanitized = sanitizeEvidenceValue(value[key]);
        if (sanitized !== null && sanitized !== '') {
          next[key] = sanitized;
        }
      }
    });

    return Object.keys(next).length > 0 ? next : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return 'redacted-url';
    }

    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return null;
}

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
  const receipt = sanitizeEvidenceValue(options.receipt || capability.lastSuccess);
  const lastError = sanitizeEvidenceValue(capability.lastError);
  const provider = capability.provider || capability.runtimeProvider || 'medical-api';
  const liveReady = Boolean(capability.liveConfigured) && effectiveMode === 'live';

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
      provider,
      liveReady,
      lastSuccessAt: capability.lastSuccessAt || null,
      lastErrorAt: capability.lastErrorAt || null,
      successCount: Number(capability.successCount || 0),
      errorCount: Number(capability.errorCount || 0),
      recentReceipt: receipt,
      lastError,
      generatedAt: new Date().toISOString(),
      detail: options.detail || null,
    },
    evidence: {
      provider,
      liveReady,
      lastSuccessAt: capability.lastSuccessAt || null,
      lastErrorAt: capability.lastErrorAt || null,
      successCount: Number(capability.successCount || 0),
      errorCount: Number(capability.errorCount || 0),
      recentReceipt: receipt,
      lastError,
    },
  };
}

module.exports = {
  createMedicalMeta,
};
