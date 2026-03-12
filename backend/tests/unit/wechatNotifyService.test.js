'use strict';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../../src/services/sosWechatDirectService', () => ({
  sendSosWechat: jest.fn(),
  getCapabilityReport: jest.fn(),
}));
jest.mock('../../src/utils/providerRuntime', () => ({
  mergeProviderRuntime: jest.fn((_provider, payload) => payload),
  recordProviderSuccess: jest.fn(),
}));

const axios = require('axios');
const direct = require('../../src/services/sosWechatDirectService');
const runtime = require('../../src/utils/providerRuntime');
const service = require('../../src/services/wechatNotifyService');

describe('wechatNotifyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SOS_WECHAT_NOTIFY_URL;
    direct.getCapabilityReport.mockReturnValue({
      provider: 'wechat_subscribe_message',
      requestedMode: 'auto',
      effectiveMode: 'stub',
      fallbackAllowed: true,
      liveConfigured: false,
      missingConfig: ['WX_ACCESS_TOKEN'],
    });
  });

  it('returns capability and delegates to direct mode when webhook is absent', async () => {
    const capability = service.getCapabilityReport();
    expect(capability).toMatchObject({ key: 'sos_wechat_notify', effectiveMode: 'stub' });

    direct.sendSosWechat.mockResolvedValueOnce({ provider: 'wechat_subscribe_message', mock: true });
    await expect(service.sendWechatNotification({ open_id: 'openid-1' })).resolves.toEqual({ provider: 'wechat_subscribe_message', mock: true });
  });

  it('uses webhook delivery and maps errors', async () => {
    process.env.SOS_WECHAT_NOTIFY_URL = 'https://notify.example/sos';
    axios.post.mockResolvedValueOnce({ data: { ok: true } });
    await expect(service.sendWechatNotification({ open_id: 'openid-2', event_id: 7 })).resolves.toEqual({ ok: true });
    expect(runtime.recordProviderSuccess).toHaveBeenCalled();

    axios.post.mockRejectedValueOnce(new Error('down'));
    await expect(service.sendWechatNotification({ open_id: 'openid-2', event_id: 7 })).rejects.toMatchObject({ statusCode: 502 });
  });
});
