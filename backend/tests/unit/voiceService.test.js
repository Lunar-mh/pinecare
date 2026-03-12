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
    jest.clearAllMocks();
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
    jest.resetModules();
    process.env = { ...originalEnv, ...env };
    axios = require('axios');
    ossService = require('../../src/services/ossService');
    ossService.uploadAudio.mockResolvedValue('https://oss.example.com/voice/test.wav');
    voiceService = require('../../src/services/voiceService');
    return voiceService;
  }

  it('returns stub text in sandbox when mode is stub', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'stub', COMPETITION_SANDBOX: '1', PRODUCTION_LIVE: '0' });
    const result = await service.speechToText(Buffer.from('audio').toString('base64'));
    expect(result).toContain('sandbox speech-to-text transcript');
    expect(ossService.uploadAudio).not.toHaveBeenCalled();
  });

  it('returns stub audio in sandbox when mode is stub', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'stub', COMPETITION_SANDBOX: '1', PRODUCTION_LIVE: '0' });
    const result = await service.textToSpeech('remind me to take medicine');
    expect(Buffer.from(result, 'base64').toString('utf8')).toContain('stub-audio');
  });

  it('validates missing speech and text payloads', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'live', DASHSCOPE_API_KEY: 'test-key' });
    await expect(service.speechToText('')).rejects.toMatchObject({ code: 400 });
    await expect(service.textToSpeech('')).rejects.toMatchObject({ code: 400 });
  });

  it('throws 503 in production live when stub mode is used', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'stub', PRODUCTION_LIVE: '1', COMPETITION_SANDBOX: '0' });
    await expect(service.textToSpeech('hello')).rejects.toMatchObject({ code: 503, statusCode: 503 });
  });

  it('throws 503 in live mode when DashScope key is missing', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'live', DASHSCOPE_API_KEY: '', PRODUCTION_LIVE: '0', COMPETITION_SANDBOX: '1' });
    await expect(service.textToSpeech('hello')).rejects.toMatchObject({ code: 503 });
  });

  it('maps timeout to 504 in live speechToText flow', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'live', DASHSCOPE_API_KEY: 'test-key', VOICE_SERVICE_MAX_RETRY: '0' });
    axios.post = jest.fn().mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });
    await expect(service.speechToText(Buffer.from('audio').toString('base64'))).rejects.toMatchObject({ code: 504, statusCode: 504 });
  });

  it('polls ASR task to completion', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'live', DASHSCOPE_API_KEY: 'test-key', VOICE_SERVICE_MAX_RETRY: '0' });
    axios.post = jest.fn().mockResolvedValue({ data: { output: { task_id: 'task-1' } } });
    axios.get = jest
      .fn()
      .mockResolvedValueOnce({ data: { output: { task_status: 'SUCCEEDED', results: [{ transcription_url: 'https://example.com/transcript.json' }] } } })
      .mockResolvedValueOnce({ data: { transcripts: [{ text: 'first' }, { transcript: 'second' }] } });
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 0;
    });

    await expect(service.speechToText(Buffer.from('audio').toString('base64'))).resolves.toBe('first second');
  });

  it('rejects invalid ASR responses and failed ASR task states', async () => {
    let service = loadService({ VOICE_SERVICE_MODE: 'live', DASHSCOPE_API_KEY: 'test-key', VOICE_SERVICE_MAX_RETRY: '0' });
    axios.post = jest.fn().mockResolvedValueOnce({ data: { output: {} } });
    await expect(service.speechToText(Buffer.from('audio').toString('base64'))).rejects.toMatchObject({ code: 502 });

    service = loadService({ VOICE_SERVICE_MODE: 'live', DASHSCOPE_API_KEY: 'test-key', VOICE_SERVICE_MAX_RETRY: '0' });
    axios.post = jest.fn().mockResolvedValue({ data: { output: { task_id: 'task-2' } } });
    axios.get = jest.fn().mockResolvedValue({ data: { output: { task_status: 'FAILED', results: [{ message: 'bad audio' }] } } });
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn();
      return 0;
    });
    await expect(service.speechToText(Buffer.from('audio').toString('base64'))).rejects.toMatchObject({ code: 502 });
  });

  it('returns live base64 audio when generation succeeds', async () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'live', DASHSCOPE_API_KEY: 'test-key', VOICE_SERVICE_MAX_RETRY: '0' });
    axios.post = jest.fn().mockResolvedValue({
      data: { request_id: 'req-1', output: { audio: { url: 'https://example.com/audio.wav' } } },
    });
    axios.get = jest.fn().mockResolvedValue({ data: Buffer.from('voice-binary') });

    const result = await service.textToSpeech('read the reminder aloud');
    expect(Buffer.from(result, 'base64').toString('utf8')).toBe('voice-binary');
    expect(axios.get).toHaveBeenCalledWith('https://example.com/audio.wav', { responseType: 'arraybuffer', timeout: 10000 });
  });

  it('reports capability via shared integration mode strategy', () => {
    const service = loadService({ VOICE_SERVICE_MODE: 'auto', COMPETITION_SANDBOX: '1', PRODUCTION_LIVE: '0', DASHSCOPE_API_KEY: 'test-key' });
    expect(service.getCapabilityReport()).toMatchObject({
      requestedMode: 'auto',
      effectiveMode: 'live',
      liveConfigured: true,
      fallbackAllowed: true,
    });
    expect(service.isLiveMode()).toBe(true);
  });
});
