'use strict';

jest.mock('../../src/services/ossService', () => ({
  uploadAudio: jest.fn(),
}));

describe('voiceService', () => {
  let originalEnv;
  let axios;
  let voiceService;
  let ossService;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    axios = require('axios');
    ossService = require('../../src/services/ossService');
    ossService.uploadAudio.mockResolvedValue('https://oss.example.com/voice/test.wav');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  function loadService(env = {}) {
    process.env = { ...originalEnv, ...env };
    voiceService = require('../../src/services/voiceService');
    return voiceService;
  }

  it('returns stub text in sandbox when mode is stub', async () => {
    const service = loadService({
      VOICE_SERVICE_MODE: 'stub',
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
    });

    const result = await service.speechToText(Buffer.from('audio').toString('base64'));

    expect(result).toContain('sandbox speech-to-text transcript');
    expect(ossService.uploadAudio).not.toHaveBeenCalled();
  });

  it('returns stub audio in sandbox when mode is stub', async () => {
    const service = loadService({
      VOICE_SERVICE_MODE: 'stub',
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
    });

    const result = await service.textToSpeech('remind me to take medicine');

    expect(Buffer.from(result, 'base64').toString('utf8')).toContain('stub-audio');
  });

  it('throws 503 in production live when stub mode is used', async () => {
    const service = loadService({
      VOICE_SERVICE_MODE: 'stub',
      PRODUCTION_LIVE: '1',
      COMPETITION_SANDBOX: '0',
    });

    await expect(service.textToSpeech('hello')).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('maps timeout to 504 in live speechToText flow', async () => {
    axios.post = jest.fn().mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });

    const service = loadService({
      VOICE_SERVICE_MODE: 'live',
      DASHSCOPE_API_KEY: 'test-key',
      VOICE_SERVICE_MAX_RETRY: '0',
    });

    await expect(
      service.speechToText(Buffer.from('audio').toString('base64'))
    ).rejects.toMatchObject({
      code: 504,
      statusCode: 504,
    });
  });

  it('returns live base64 audio when generation succeeds', async () => {
    axios.post = jest.fn().mockResolvedValue({
      data: {
        output: {
          audio: {
            url: 'https://example.com/audio.wav',
          },
        },
      },
    });
    axios.get = jest.fn().mockResolvedValue({
      data: Buffer.from('voice-binary'),
    });

    const service = loadService({
      VOICE_SERVICE_MODE: 'live',
      DASHSCOPE_API_KEY: 'test-key',
      VOICE_SERVICE_MAX_RETRY: '0',
    });

    const result = await service.textToSpeech('read the reminder aloud');

    expect(Buffer.from(result, 'base64').toString('utf8')).toBe('voice-binary');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('https://example.com/audio.wav', {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
  });

  it('reports capability via shared integration mode strategy', () => {
    const service = loadService({
      VOICE_SERVICE_MODE: 'auto',
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
      DASHSCOPE_API_KEY: 'test-key',
    });

    expect(service.getCapabilityReport()).toMatchObject({
      requestedMode: 'auto',
      effectiveMode: 'live',
      liveConfigured: true,
      fallbackAllowed: true,
    });
  });
});
