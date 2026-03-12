'use strict';

jest.mock('axios', () => ({ post: jest.fn() }));

describe('qwenService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function load(env = {}) {
    jest.resetModules();
    process.env = { ...originalEnv, ...env };
    const axios = require('axios');
    const service = require('../../src/services/qwenService');
    return { axios, service };
  }

  it('validates configuration and input payloads', async () => {
    const { service } = load({ DASHSCOPE_API_KEY: '' });
    await expect(service.chatWithQwen([{ role: 'user', content: 'hi' }], 7)).rejects.toMatchObject({ code: 500 });

    const loaded = load({ DASHSCOPE_API_KEY: 'test-key' }).service;
    await expect(loaded.chatWithQwen([], 7)).rejects.toMatchObject({ code: 422 });
  });

  it('returns normalized reply payload on success', async () => {
    const { axios, service } = load({ DASHSCOPE_API_KEY: 'test-key' });
    axios.post.mockResolvedValueOnce({
      data: {
        request_id: 'req-1',
        output: { choices: [{ message: { content: 'Please drink more water.' } }] },
        usage: { input_tokens: 8, output_tokens: 12 },
      },
    });

    await expect(service.chatWithQwen([{ role: 'user', content: 'dizzy' }], 9)).resolves.toEqual({
      reply: 'Please drink more water.',
      model: expect.any(String),
      tokens: 20,
      requestId: 'req-1',
      userId: 9,
    });
  });

  it('maps empty replies and upstream errors into business errors', async () => {
    let loaded = load({ DASHSCOPE_API_KEY: 'test-key' });
    loaded.axios.post.mockResolvedValueOnce({ data: { output: { choices: [{ message: { content: '   ' } }] } } });
    await expect(loaded.service.chatWithQwen([{ role: 'user', content: 'hi' }], 1)).rejects.toMatchObject({ code: 502 });

    loaded = load({ DASHSCOPE_API_KEY: 'test-key' });
    loaded.axios.post.mockRejectedValueOnce({
      response: { status: 429, data: { code: 'RATE_LIMIT', message: 'slow down' } },
      message: 'failed',
    });
    await expect(loaded.service.chatWithQwen([{ role: 'user', content: 'hi' }], 1)).rejects.toMatchObject({
      code: 429,
      statusCode: 429,
    });
  });
});
