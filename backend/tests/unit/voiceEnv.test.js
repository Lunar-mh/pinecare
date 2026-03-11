'use strict';

describe('voiceEnv', () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function loadModule(env = {}) {
    jest.resetModules();
    process.env = { ...originalEnv, ...env };
    return require('../../src/config/voiceEnv');
  }

  it('reads trimmed voice env values with defaults', () => {
    const { getVoiceEnv } = loadModule({
      ALIYUN_ACCESS_KEY_ID: ' key-id ',
      ALIYUN_ACCESS_KEY_SECRET: ' key-secret ',
      ALIYUN_VOICE_TIMEOUT_MS: '12345',
    });

    expect(getVoiceEnv()).toEqual({
      accessKeyId: 'key-id',
      accessKeySecret: 'key-secret',
      asrEndpoint: 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr',
      ttsEndpoint: 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts',
      timeoutMs: 12345,
    });
  });

  it('validates required voice env vars', () => {
    let voiceEnv = loadModule({
      ALIYUN_ACCESS_KEY_ID: '',
      ALIYUN_ACCESS_KEY_SECRET: '',
    });

    expect(() => voiceEnv.validateVoiceEnv()).toThrow(expect.objectContaining({
      code: 500,
      statusCode: 500,
    }));

    voiceEnv = loadModule({
      ALIYUN_ACCESS_KEY_ID: 'id',
      ALIYUN_ACCESS_KEY_SECRET: 'secret',
      ALIYUN_ASR_ENDPOINT: 'https://example.com/asr',
      ALIYUN_TTS_ENDPOINT: 'https://example.com/tts',
    });

    expect(() => voiceEnv.validateVoiceEnv()).not.toThrow();
    expect(voiceEnv.getVoiceEnv()).toEqual(expect.objectContaining({
      asrEndpoint: 'https://example.com/asr',
      ttsEndpoint: 'https://example.com/tts',
    }));
  });
});
