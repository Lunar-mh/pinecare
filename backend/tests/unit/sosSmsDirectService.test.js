'use strict';

jest.mock('axios', () => ({
  get: jest.fn(),
}));


describe('sosSmsDirectService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.SOS_SMS_MODE;
    delete process.env.ALIYUN_ACCESS_KEY_ID;
    delete process.env.ALIYUN_ACCESS_KEY_SECRET;
    delete process.env.SOS_SMS_SIGN_NAME;
    delete process.env.SOS_SMS_TEMPLATE_CODE;
    process.env.COMPETITION_SANDBOX = '1';
    process.env.PRODUCTION_LIVE = '0';
  });

  it('returns mock result when live config is missing in sandbox', async () => {
    const service = require('../../src/services/sosSmsDirectService');
    await expect(
      service.sendSosSms({ phone: '13800000000', event_id: 1, contact_name: 'Family' })
    ).resolves.toMatchObject({ mock: true, provider: 'aliyun_sms' });
  });

  it('builds live capability when aliyun config is present', () => {
    process.env.SOS_SMS_MODE = 'live';
    process.env.ALIYUN_ACCESS_KEY_ID = 'ak';
    process.env.ALIYUN_ACCESS_KEY_SECRET = 'sk';
    process.env.SOS_SMS_SIGN_NAME = 'Yinban';
    process.env.SOS_SMS_TEMPLATE_CODE = 'SMS_TEMPLATE';

    const service = require('../../src/services/sosSmsDirectService');
    expect(service.getCapabilityReport()).toMatchObject({
      liveConfigured: true,
      effectiveMode: 'live',
      provider: 'aliyun_sms',
    });
  });

  it('sends request to aliyun sms endpoint in live mode', async () => {
    const axios = require('axios');
    process.env.SOS_SMS_MODE = 'live';
    process.env.ALIYUN_ACCESS_KEY_ID = 'ak';
    process.env.ALIYUN_ACCESS_KEY_SECRET = 'sk';
    process.env.SOS_SMS_SIGN_NAME = 'Yinban';
    process.env.SOS_SMS_TEMPLATE_CODE = 'SMS_TEMPLATE';
    axios.get.mockResolvedValue({ data: { Code: 'OK', Message: 'OK', BizId: 'biz-1', RequestId: 'req-1' } });

    const service = require('../../src/services/sosSmsDirectService');
    const result = await service.sendSosSms({
      phone: '13800000000',
      event_id: 1,
      contact_name: 'Family',
      address: 'Yan\'an',
      triggered_at: '2026-03-11 20:00:00',
    });

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ provider: 'aliyun_sms', code: 'OK', bizId: 'biz-1' });
  });
});

