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
        provider: 'medical-api',
        lastSuccessAt: '2026-03-12T10:00:00.000Z',
        lastSuccess: {
          operation: 'create_appointment',
          requestId: 'req-1',
          thirdPartyAppointId: 'appt-1',
          hasUrl: true,
          url: 'https://sensitive.example/report',
        },
        lastErrorAt: '2026-03-12T09:00:00.000Z',
        lastError: {
          message: 'upstream failed',
          extra: { token: 'secret' },
        },
        successCount: 3,
        errorCount: 1,
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
        provider: 'medical-api',
        liveReady: true,
        lastSuccessAt: '2026-03-12T10:00:00.000Z',
        lastErrorAt: '2026-03-12T09:00:00.000Z',
        successCount: 3,
        errorCount: 1,
        recentReceipt: {
          operation: 'create_appointment',
          requestId: 'req-1',
          thirdPartyAppointId: 'appt-1',
          hasUrl: true,
        },
      },
      evidence: {
        provider: 'medical-api',
        recentReceipt: {
          operation: 'create_appointment',
          requestId: 'req-1',
          thirdPartyAppointId: 'appt-1',
          hasUrl: true,
        },
      },
    });
    expect(result.diagnostics.recentReceipt.url).toBeUndefined();
  });

  it('prefers explicit receipt payloads when provided', () => {
    const service = {
      getSourceTag: jest.fn(() => 'third_party_live'),
      getModeTag: jest.fn(() => 'live'),
      getCapabilityReport: jest.fn(() => ({
        mode: 'live',
        effectiveMode: 'live',
        liveConfigured: true,
        fallbackAllowed: false,
        circuitOpen: false,
        missingConfig: [],
      })),
    };

    const result = createMedicalMeta(service, 'medical.appointment.create', {
      receipt: {
        requestId: 'req-2',
        thirdPartyAppointId: 'appt-2',
        doctorId: 8,
      },
    });

    expect(result.evidence.recentReceipt).toEqual({
      requestId: 'req-2',
      thirdPartyAppointId: 'appt-2',
      doctorId: 8,
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
        liveReady: false,
      },
    });

    process.env = originalEnv;
  });
});
