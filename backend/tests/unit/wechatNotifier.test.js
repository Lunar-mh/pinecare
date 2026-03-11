'use strict';

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

describe('wechatNotifier', () => {
  let originalEnv;
  let axios;
  let query;
  let wechatNotifier;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    axios = require('axios');
    ({ query } = require('../../src/config/database'));
    query.mockResolvedValue([[{ id: 1, openid: 'openid-001' }]]);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  function loadNotifier(env = {}) {
    process.env = { ...originalEnv, ...env };
    wechatNotifier = require('../../src/utils/wechatNotifier');
    return wechatNotifier;
  }

  it('uses mock path in sandbox when access token is missing', async () => {
    const notifier = loadNotifier({
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
      WX_MSG_TEMPLATE_ID: 'template-001',
      WX_ACCESS_TOKEN: '',
    });

    const result = await notifier.sendMedicationReminder({
      userId: 1,
      medicationName: '阿司匹林',
      dosage: '1片',
      scheduledTime: '2026-03-11T08:00:00.000Z',
      remark: '饭后服用',
    });

    expect(result.mock).toBe(true);
    expect(result.msgid).toContain('mock-');
  });

  it('throws 503 in production live when notify config is missing', async () => {
    const notifier = loadNotifier({
      COMPETITION_SANDBOX: '0',
      PRODUCTION_LIVE: '1',
      WX_MSG_TEMPLATE_ID: 'template-001',
      WX_ACCESS_TOKEN: '',
    });

    await expect(
      notifier.sendMedicationReminder({
        userId: 1,
        medicationName: '阿司匹林',
        dosage: '1片',
        scheduledTime: '2026-03-11T08:00:00.000Z',
      })
    ).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('retries and succeeds when wechat api recovers from 45009', async () => {
    axios.post = jest
      .fn()
      .mockResolvedValueOnce({ data: { errcode: 45009, errmsg: 'reach max api daily quota' } })
      .mockResolvedValueOnce({ data: { errcode: 0, errmsg: 'ok', msgid: 'msg-001' } });

    const notifier = loadNotifier({
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
      WX_MSG_TEMPLATE_ID: 'template-001',
      WX_ACCESS_TOKEN: 'token-001',
      WECHAT_NOTIFY_MOCK: '0',
    });

    const result = await notifier.sendRefillReminder({
      userId: 1,
      medicationName: '阿司匹林',
      remainingQuantity: 2,
      reminderThreshold: 5,
    });

    expect(result).toEqual({
      msgid: 'msg-001',
      mock: false,
    });
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('maps timeout to 504', async () => {
    axios.post = jest.fn().mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });

    const notifier = loadNotifier({
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
      WX_MSG_TEMPLATE_ID: 'template-001',
      WX_ACCESS_TOKEN: 'token-001',
      WECHAT_NOTIFY_MOCK: '0',
    });

    await expect(
      notifier.sendFamilyMissedReminder({
        familyUserId: 1,
        medicationName: '阿司匹林',
        scheduledTime: '2026-03-11T08:00:00.000Z',
      })
    ).rejects.toMatchObject({
      code: 504,
      statusCode: 504,
    });
  });

  it('throws 400 when user has no openid', async () => {
    query.mockResolvedValue([[{ id: 1, openid: null }]]);

    const notifier = loadNotifier({
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
      WX_MSG_TEMPLATE_ID: 'template-001',
    });

    await expect(
      notifier.sendMedicationReminder({
        userId: 1,
        medicationName: '阿司匹林',
        dosage: '1片',
        scheduledTime: '2026-03-11T08:00:00.000Z',
      })
    ).rejects.toMatchObject({
      code: 400,
      statusCode: 400,
    });
  });
});
