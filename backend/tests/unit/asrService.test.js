'use strict';

jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('../../src/config/voiceEnv', () => ({
  getVoiceEnv: jest.fn(),
  validateVoiceEnv: jest.fn(),
}));
jest.mock('../../src/utils/logger', () => ({ error: jest.fn() }));

const axios = require('axios');
const { getVoiceEnv, validateVoiceEnv } = require('../../src/config/voiceEnv');
const logger = require('../../src/utils/logger');
const asrService = require('../../src/services/asrService');

describe('asrService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVoiceEnv.mockReturnValue({
      accessKeyId: 'key',
      accessKeySecret: 'secret',
      asrEndpoint: 'https://voice.example/asr',
      timeoutMs: 3000,
    });
  });

  it('recognizes transcript from multiple response shapes', async () => {
    axios.post.mockResolvedValueOnce({ data: { text: 'hello' } });
    await expect(asrService.recognize('audio-base64')).resolves.toBe('hello');

    axios.post.mockResolvedValueOnce({ data: { sentences: [{ text: 'ni' }, { transcript: 'hao' }] } });
    await expect(asrService.recognize('audio-base64')).resolves.toBe('ni hao');
  });

  it('maps validation, empty transcript, response, request, and generic failures', async () => {
    await expect(asrService.recognize('')).rejects.toMatchObject({ code: 400 });

    axios.post.mockResolvedValueOnce({ data: {} });
    await expect(asrService.recognize('audio-base64')).rejects.toMatchObject({ code: 422 });

    axios.post.mockRejectedValueOnce({ response: { status: 502, data: { err: 'bad' } } });
    await expect(asrService.recognize('audio-base64')).rejects.toMatchObject({ code: 502 });

    axios.post.mockRejectedValueOnce({ request: {}, message: 'timeout' });
    await expect(asrService.recognize('audio-base64')).rejects.toMatchObject({ code: 504 });

    axios.post.mockRejectedValueOnce(new Error('boom'));
    await expect(asrService.recognize('audio-base64')).rejects.toMatchObject({ code: 500 });
    expect(validateVoiceEnv).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});
