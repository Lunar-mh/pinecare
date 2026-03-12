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
const ttsService = require('../../src/services/ttsService');

describe('ttsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVoiceEnv.mockReturnValue({
      accessKeyId: 'key',
      accessKeySecret: 'secret',
      ttsEndpoint: 'https://voice.example/tts',
      timeoutMs: 3000,
    });
  });

  it('synthesizes audio from binary and json payload responses', async () => {
    axios.post.mockResolvedValueOnce({
      headers: { 'content-type': 'audio/mpeg' },
      data: Buffer.from('audio'),
    });
    await expect(ttsService.synthesize('hello')).resolves.toBe(Buffer.from('audio').toString('base64'));

    axios.post.mockResolvedValueOnce({
      headers: { 'content-type': 'application/json' },
      data: Buffer.from(JSON.stringify({ output: { audio: { data: 'base64-audio' } } })),
    });
    await expect(ttsService.synthesize('hello')).resolves.toBe('base64-audio');
  });

  it('maps validation and transport failures', async () => {
    await expect(ttsService.synthesize('')).rejects.toMatchObject({ code: 400 });

    axios.post.mockResolvedValueOnce({ headers: { 'content-type': 'application/json' }, data: Buffer.from('{}') });
    await expect(ttsService.synthesize('hello')).rejects.toMatchObject({ code: 422 });

    axios.post.mockRejectedValueOnce({ response: { status: 502 } });
    await expect(ttsService.synthesize('hello')).rejects.toMatchObject({ code: 502 });

    axios.post.mockRejectedValueOnce({ request: {}, message: 'timeout' });
    await expect(ttsService.synthesize('hello')).rejects.toMatchObject({ code: 504 });

    axios.post.mockRejectedValueOnce(new Error('boom'));
    await expect(ttsService.synthesize('hello')).rejects.toMatchObject({ code: 500 });
    expect(validateVoiceEnv).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});
