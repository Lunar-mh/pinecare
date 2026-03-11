'use strict';

const { createMedicalMeta } = require('../../src/services/medicalMeta');

describe('medicalMeta', () => {
  it('builds diagnostics from capability report when available', () => {
    const service = {
      getSourceTag: jest.fn(() => 'third_party_live'),
      getModeTag: jest.fn(() => 'live'),
      getCapabilityReport: jest.fn(() => ({
        mode: 'auto',
        effectiveMode: 'live',
        liveConfigured: true,
        fallbackAllowed: false,
        circuitOpen: false,
        missingConfig: [],
      })),
    };

    const result = createMedicalMeta(service, 'medical.reports.list', {
      reason: 'report_sync_complete',
    });

    expect(result).toMatchObject({
      source: 'third_party_live',
      mode: 'live',
      fallbackUsed: false,
      diagnostics: {
        operation: 'medical.reports.list',
        source: 'third_party_live',
        mode: 'live',
        requestedMode: 'auto',
        effectiveMode: 'live',
        reason: 'report_sync_complete',
        liveConfigured: true,
        fallbackAllowed: false,
        circuitOpen: false,
        missingConfig: [],
        configState: 'ready',
      },
    });
  });

  it('falls back to env-based capability inference when service lacks report support', () => {
    const originalEnv = { ...process.env };
    process.env.MEDICAL_API_BASE_URL = '';
    process.env.MEDICAL_API_KEY = '';
    process.env.MEDICAL_API_ALLOW_STUB_FALLBACK = 'true';

    const result = createMedicalMeta(null, 'medical.directory.hospitals', {
      source: 'public_curated_dataset',
      mode: 'stub',
      fallbackUsed: true,
      reason: 'public_dataset_fallback',
      detail: 'using dataset fallback',
    });

    expect(result).toMatchObject({
      source: 'public_curated_dataset',
      mode: 'stub',
      fallbackUsed: true,
      diagnostics: {
        requestedMode: 'stub',
        effectiveMode: 'stub',
        fallbackUsed: true,
        reason: 'public_dataset_fallback',
        liveConfigured: false,
        fallbackAllowed: true,
        missingConfig: ['MEDICAL_API_BASE_URL', 'MEDICAL_API_KEY'],
        configState: 'missing',
        detail: 'using dataset fallback',
      },
    });

    process.env = originalEnv;
  });
});
