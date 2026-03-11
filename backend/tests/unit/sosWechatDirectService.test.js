'use strict';

jest.mock('axios', () => ({
  post: jest.fn(),
}));


describe('sosWechatDirectService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.SOS_WECHAT_MODE;
    delete process.env.WX_ACCESS_TOKEN;
    delete process.env.SOS_WX_MSG_TEMPLATE_ID;
    process.env.COMPETITION_SANDBOX = '1';
    process.env.PRODUCTION_LIVE = '0';
  });

  it('returns mock result when live config is missing in sandbox', async () => {
    const service = require('../../src/services/sosWechatDirectService');
    await expect(
      service.sendSosWechat({ open_id: 'openid-1', event_id: 1, contact_name: 'Family' })
    ).resolves.toMatchObject({ mock: true, provider: 'wechat_subscribe_message' });
  });

  it('builds live capability when wechat config is present', () => {
    process.env.SOS_WECHAT_MODE = 'live';
    process.env.WX_ACCESS_TOKEN = 'token';
    process.env.SOS_WX_MSG_TEMPLATE_ID = 'tmpl';

    const service = require('../../src/services/sosWechatDirectService');
    expect(service.getCapabilityReport()).toMatchObject({
      liveConfigured: true,
      effectiveMode: 'live',
      provider: 'wechat_subscribe_message',
    });
  });

  it('posts subscribe message in live mode', async () => {
    const axios = require('axios');
    process.env.SOS_WECHAT_MODE = 'live';
    process.env.WX_ACCESS_TOKEN = 'token';
    process.env.SOS_WX_MSG_TEMPLATE_ID = 'tmpl';
    axios.post.mockResolvedValue({ data: { errcode: 0, errmsg: 'ok', msgid: 123 } });

    const service = require('../../src/services/sosWechatDirectService');
    const result = await service.sendSosWechat({
      open_id: 'openid-1',
      event_id: 1,
      contact_name: 'Family',
      address: 'Yan-an',
      triggered_at: '2026-03-11 20:00:00',
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ provider: 'wechat_subscribe_message', msgid: 123 });
  });
});

