'use strict';

jest.mock('axios', () => ({ post: jest.fn() }));

const axios = require('axios');
const service = require('../../src/services/notificationService');

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FALL_WECHAT_NOTIFY_URL;
    delete process.env.FALL_SMS_NOTIFY_URL;
    jest.spyOn(service.constructor, '_sleep').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty results when no contacts are provided', async () => {
    await expect(service.notifyContacts({ id: 1 }, [])).resolves.toEqual([]);
  });

  it('sends mixed notifications and records failures per contact', async () => {
    jest.spyOn(service, 'sendWechat').mockResolvedValueOnce();
    jest.spyOn(service, 'sendSms').mockRejectedValueOnce(new Error('sms failed'));

    const result = await service.notifyContacts(
      { id: 9, detectedAt: '2026-03-12T10:00:00.000Z', sensitivity: 'high' },
      [
        { contactId: 1, notifyMethod: 'wechat', contactType: 'family', wechatOpenId: 'openid-1' },
        { contactId: 2, notifyMethod: 'sms', contactType: 'family', phone: '13800000000' },
      ]
    );

    expect(result).toEqual([
      { contactId: 1, notifyMethod: 'wechat', success: true },
      { contactId: 2, notifyMethod: 'sms', success: false, error: 'sms failed' },
    ]);
  });

  it('validates required wechat and sms configuration', async () => {
    await expect(service.sendWechat({ contactType: 'family' }, { id: 1 })).rejects.toThrow();
    process.env.FALL_WECHAT_NOTIFY_URL = 'https://notify.example.com/wechat';
    await expect(service.sendWechat({ contactType: 'family' }, { id: 1 })).rejects.toThrow();

    await expect(service.sendSms({ contactType: 'family' }, { id: 1 })).rejects.toThrow();
    process.env.FALL_SMS_NOTIFY_URL = 'https://notify.example.com/sms';
    await expect(service.sendSms({ contactType: 'family' }, { id: 1 })).rejects.toThrow();
  });

  it('retries transport requests and surfaces the last error', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('network-1'))
      .mockRejectedValueOnce(new Error('network-2'))
      .mockResolvedValueOnce({ ok: true });

    await expect(service._requestWithRetry('https://notify.example.com', { foo: 'bar' })).resolves.toBeUndefined();
    expect(axios.post).toHaveBeenCalledTimes(3);

    axios.post.mockReset();
    axios.post.mockRejectedValue(new Error('still down'));
    await expect(service._requestWithRetry('https://notify.example.com', { foo: 'bar' })).rejects.toThrow('still down');
  });
});
