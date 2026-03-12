'use strict';

jest.mock('axios', () => ({ get: jest.fn() }));

const axios = require('axios');
const wechatService = require('../../src/services/wechatService');

describe('wechatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WX_APPID = 'appid';
    process.env.WX_APPSECRET = 'secret';
  });

  it('returns session data when wechat responds with openid', async () => {
    axios.get.mockResolvedValueOnce({ data: { openid: 'openid-1', session_key: 'sess-1', unionid: 'union-1' } });

    await expect(wechatService.code2Session('code-1')).resolves.toEqual({
      openid: 'openid-1',
      session_key: 'sess-1',
      unionid: 'union-1',
    });
  });

  it('maps upstream business errors and transport errors', async () => {
    axios.get.mockResolvedValueOnce({ data: { errcode: 40029, errmsg: 'bad code' } });
    await expect(wechatService.code2Session('bad')).rejects.toMatchObject({ code: 400, statusCode: 400 });

    axios.get.mockRejectedValueOnce(new Error('timeout'));
    await expect(wechatService.code2Session('timeout')).rejects.toMatchObject({ code: 502, statusCode: 502 });
  });
});
