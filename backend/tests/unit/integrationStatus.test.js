'use strict';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('../../src/services/aiService', () => ({
  getCapabilityReport: jest.fn(),
}));

jest.mock('../../src/services/companionService', () => ({
  getCapabilityReport: jest.fn(),
}));

jest.mock('../../src/services/voiceService', () => ({
  getCapabilityReport: jest.fn(),
}));

jest.mock('../../src/services/medicalApiService', () => ({
  getCapabilityReport: jest.fn(),
  getSourceTag: jest.fn(),
}));

jest.mock('../../src/services/ossService', () => ({
  getCapabilityReport: jest.fn(),
}));

jest.mock('../../src/utils/wechatNotifier', () => ({
  getCapabilityReport: jest.fn(),
}));

jest.mock('../../src/services/smsNotifyService', () => ({
  getCapabilityReport: jest.fn(),
}));

jest.mock('../../src/services/wechatNotifyService', () => ({
  getCapabilityReport: jest.fn(),
}));

jest.mock('../../src/config/runtimeMode', () => ({
  resolveMode: jest.fn(() => 'COMPETITION_SANDBOX'),
}));

const fs = require('fs');
const aiService = require('../../src/services/aiService');
const companionService = require('../../src/services/companionService');
const voiceService = require('../../src/services/voiceService');
const medicalApiService = require('../../src/services/medicalApiService');
const ossService = require('../../src/services/ossService');
const wechatNotifier = require('../../src/utils/wechatNotifier');
const smsNotifyService = require('../../src/services/smsNotifyService');
const wechatNotifyService = require('../../src/services/wechatNotifyService');
const { buildIntegrationRows } = require('../../src/services/adminOps/adminDiagnostics/integrationStatus');

function baseCapability(overrides = {}) {
  return {
    requestedMode: 'auto',
    effectiveMode: 'stub',
    liveConfigured: false,
    fallbackAllowed: true,
    runtimeMode: 'COMPETITION_SANDBOX',
    missingConfig: ['MISSING_KEY'],
    ...overrides,
  };
}

describe('integrationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    aiService.getCapabilityReport.mockReturnValue(baseCapability());
    companionService.getCapabilityReport.mockReturnValue(baseCapability());
    voiceService.getCapabilityReport.mockReturnValue(baseCapability());
    ossService.getCapabilityReport.mockReturnValue(baseCapability());
    medicalApiService.getCapabilityReport.mockReturnValue(baseCapability());
    medicalApiService.getSourceTag.mockReturnValue('third_party_stub');
    wechatNotifier.getCapabilityReport.mockReturnValue(baseCapability());
    smsNotifyService.getCapabilityReport.mockReturnValue({
      key: 'sos_sms_notify',
      configured: false,
      mode: 'auto',
      effectiveMode: 'stub',
      fallbackAllowed: true,
      source: 'aliyun_sms',
      missingConfig: ['ALIYUN_ACCESS_KEY_ID'],
      notes: 'stub fallback active',
    });
    wechatNotifyService.getCapabilityReport.mockReturnValue({
      key: 'sos_wechat_notify',
      configured: false,
      mode: 'auto',
      effectiveMode: 'stub',
      fallbackAllowed: true,
      source: 'wechat_subscribe_message',
      missingConfig: ['WECHAT_APP_ID'],
      notes: 'stub fallback active',
    });
  });

  it('builds sandbox fallback rows for ai, voice, medical, and notify integrations', () => {
    const rows = buildIntegrationRows();
    const rowMap = new Map(rows.map((item) => [item.key, item]));

    expect(rowMap.get('ai_consult')).toMatchObject({
      effectiveMode: 'stub',
      healthy: true,
      source: 'ai_consult_stub',
    });
    expect(rowMap.get('voice')).toMatchObject({
      effectiveMode: 'stub',
      healthy: true,
      source: 'voice_stub',
    });
    expect(rowMap.get('medical')).toMatchObject({
      effectiveMode: 'stub',
      healthy: true,
      source: 'third_party_stub',
    });
    expect(rowMap.get('wechat_notify')).toMatchObject({
      effectiveMode: 'stub',
      healthy: true,
      source: 'wechat_template_api',
    });
    expect(rowMap.get('sos_sms_notify')).toMatchObject({
      effectiveMode: 'stub',
      healthy: true,
      source: 'aliyun_sms',
    });
    expect(rowMap.get('sos_wechat_notify')).toMatchObject({
      effectiveMode: 'stub',
      healthy: true,
      source: 'wechat_subscribe_message',
    });
    expect(rowMap.get('competition_seed')).toMatchObject({
      effectiveMode: 'missing',
      healthy: false,
      source: 'local_generated_assets',
    });
  });

  it('builds live-ready rows when upstream capabilities are configured', () => {
    fs.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    aiService.getCapabilityReport.mockReturnValue(baseCapability({
      effectiveMode: 'live',
      liveConfigured: true,
      missingConfig: [],
    }));
    companionService.getCapabilityReport.mockReturnValue(baseCapability({
      effectiveMode: 'live',
      liveConfigured: true,
      missingConfig: [],
    }));
    voiceService.getCapabilityReport.mockReturnValue(baseCapability({
      effectiveMode: 'live',
      liveConfigured: true,
      missingConfig: [],
    }));
    ossService.getCapabilityReport.mockReturnValue(baseCapability({
      effectiveMode: 'live',
      liveConfigured: true,
      missingConfig: [],
    }));
    medicalApiService.getCapabilityReport.mockReturnValue(baseCapability({
      effectiveMode: 'live',
      liveConfigured: true,
      fallbackAllowed: false,
      missingConfig: [],
    }));
    medicalApiService.getSourceTag.mockReturnValue('third_party_live');
    wechatNotifier.getCapabilityReport.mockReturnValue(baseCapability({
      effectiveMode: 'live',
      liveConfigured: true,
      missingConfig: [],
    }));
    smsNotifyService.getCapabilityReport.mockReturnValue({
      key: 'sos_sms_notify',
      configured: true,
      mode: 'live',
      effectiveMode: 'live',
      fallbackAllowed: false,
      source: 'aliyun_sms',
      missingConfig: [],
      notes: 'live path active',
    });
    wechatNotifyService.getCapabilityReport.mockReturnValue({
      key: 'sos_wechat_notify',
      configured: true,
      mode: 'live',
      effectiveMode: 'live',
      fallbackAllowed: false,
      source: 'wechat_subscribe_message',
      missingConfig: [],
      notes: 'live path active',
    });

    const rows = buildIntegrationRows();
    const rowMap = new Map(rows.map((item) => [item.key, item]));

    expect(rowMap.get('ai_consult')).toMatchObject({ effectiveMode: 'live', healthy: true });
    expect(rowMap.get('voice')).toMatchObject({ effectiveMode: 'live', healthy: true });
    expect(rowMap.get('medical')).toMatchObject({ effectiveMode: 'live', healthy: true, source: 'third_party_live' });
    expect(rowMap.get('wechat_notify')).toMatchObject({ effectiveMode: 'live', healthy: true });
    expect(rowMap.get('sos_sms_notify')).toMatchObject({ effectiveMode: 'live', healthy: true });
    expect(rowMap.get('sos_wechat_notify')).toMatchObject({ effectiveMode: 'live', healthy: true });
    expect(rowMap.get('competition_seed')).toMatchObject({
      effectiveMode: 'ready',
      generated: true,
      sqlReady: true,
      healthy: true,
    });
  });
});


