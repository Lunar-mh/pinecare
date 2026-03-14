'use strict';

const axios = require('axios');
const ossService = require('./ossService');
const { createUpstreamError, isRetryableError, logThirdPartyError } = require('../utils/thirdParty');
const { recordProviderSuccess } = require('../utils/providerRuntime');
const { resolveIntegrationMode } = require('../config/integrationMode');
const { buildCapabilityReport } = require('./integrationCapability/buildReport');
const { createBizErrorFromMessage: createBizError } = require('../utils/serviceError');

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';
const REQUEST_TIMEOUT_MS = Number(process.env.VOICE_SERVICE_TIMEOUT_MS || 15000);
const MAX_RETRY = Math.max(0, Number(process.env.VOICE_SERVICE_MAX_RETRY || 2));


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getModeStrategy = () =>
  resolveIntegrationMode({
    requestedMode: process.env.VOICE_SERVICE_MODE || process.env.DASHSCOPE_MODE || 'auto',
    liveConfigured: Boolean(String(process.env.DASHSCOPE_API_KEY || '').trim()),
  });
const toVoiceError = (err) =>
  createUpstreamError(err, {
    timeout: 'Voice service timed out.',
    rateLimited: 'Voice service is rate limited.',
    unavailable: 'Voice service is unavailable.',
    failed: 'Voice service request failed.',
  });

async function withRetry(operation, requestFactory) {
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      return await requestFactory();
    } catch (err) {
      lastError = err;
      logThirdPartyError('dashscope-voice', err, { operation, attempt: attempt + 1 });
      if (!isRetryableError(err) || attempt >= MAX_RETRY) throw toVoiceError(err);
      await sleep(100 * (attempt + 1));
    }
  }
  throw toVoiceError(lastError);
}

function requireDashScopeKey() {
  const key = String(process.env.DASHSCOPE_API_KEY || '').trim();
  if (!key) throw createBizError('DashScope API key is not configured.', 503, 503);
  return key;
}

const buildStubText = () => '测试系统自动生成的语音转写文本';
const buildStubAudio = (text) => Buffer.from(`stub-audio:${String(text || '').trim() || 'voice'}`, 'utf8').toString('base64');

class VoiceService {
  getCapabilityReport() {
    return buildCapabilityReport('dashscope-voice', getModeStrategy());
  }

  isLiveMode() {
    return getModeStrategy().effectiveMode === 'live';
  }

  async speechToText(audioBase64) {
    if (!audioBase64 || typeof audioBase64 !== 'string') throw createBizError('audio payload is required.', 400, 400);

    const strategy = getModeStrategy();
    if (strategy.effectiveMode !== 'live') {
      if (!strategy.stubAllowed) throw createBizError('Voice stub mode is disabled in PRODUCTION_LIVE mode.', 503, 503);
      return buildStubText();
    }

    const apiKey = requireDashScopeKey();
    const audioUrl = await this._uploadAudioToOSS(audioBase64);
    const submitRes = await withRetry('speechToText.submit', () =>
      axios.post(
        `${DASHSCOPE_BASE}/services/audio/asr/transcription`,
        {
          model: 'fun-asr',
          input: { file_urls: [audioUrl] },
          parameters: { channel_id: [0], language_hints: ['zh', 'en'] },
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-DashScope-Async': 'enable' },
          timeout: REQUEST_TIMEOUT_MS,
        }
      )
    );

    const taskId = submitRes && submitRes.data && submitRes.data.output ? submitRes.data.output.task_id : null;
    if (!taskId) throw createBizError('ASR task submission failed.', 502, 502);
    return this._pollAsrTask(taskId, apiKey);
  }

  async textToSpeech(text) {
    if (!String(text || '').trim()) throw createBizError('text is required.', 400, 400);

    const strategy = getModeStrategy();
    if (strategy.effectiveMode !== 'live') {
      if (!strategy.stubAllowed) throw createBizError('Voice stub mode is disabled in PRODUCTION_LIVE mode.', 503, 503);
      return buildStubAudio(text);
    }

    const apiKey = requireDashScopeKey();
    const res = await withRetry('textToSpeech.generate', () =>
      axios.post(
        `${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`,
        { model: 'qwen3-tts-flash', input: { text, voice: 'Cherry', language_type: 'Chinese' } },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: REQUEST_TIMEOUT_MS }
      )
    );

    const audioUrl = res && res.data && res.data.output && res.data.output.audio ? res.data.output.audio.url : null;
    if (!audioUrl) throw createBizError('TTS response missing audio URL.', 502, 502);

    const audioRes = await withRetry('textToSpeech.download', () => axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 10000 }));
    recordProviderSuccess('dashscope-voice', {
      operation: 'text_to_speech',
      mode: 'live',
      requestId: res.data && res.data.request_id ? res.data.request_id : null,
      audioUrl,
    });
    return Buffer.from(audioRes.data).toString('base64');
  }

  async _uploadAudioToOSS(audioBase64) {
    const buffer = Buffer.from(audioBase64, 'base64');
    const key = `voice/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`;
    return ossService.uploadAudio(buffer, key);
  }

  async _pollAsrTask(taskId, apiKey, maxRetries = 30, intervalMs = 1000) {
    for (let i = 0; i < maxRetries; i += 1) {
      await sleep(intervalMs);
      const res = await withRetry('speechToText.poll', () => axios.get(`${DASHSCOPE_BASE}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000 }));
      const status = res && res.data && res.data.output ? res.data.output.task_status : null;

      if (status === 'SUCCEEDED') {
        const transcriptionUrl = res && res.data && res.data.output && Array.isArray(res.data.output.results) && res.data.output.results[0]
          ? res.data.output.results[0].transcription_url
          : null;
        if (!transcriptionUrl) throw createBizError('ASR task completed without transcript URL.', 502, 502);

        const transcRes = await withRetry('speechToText.transcript', () => axios.get(transcriptionUrl, { timeout: 10000 }));
        const transcript = (Array.isArray(transcRes.data && transcRes.data.transcripts) ? transcRes.data.transcripts : [])
          .map((segment) => segment.text || segment.transcript || '')
          .join(' ')
          .trim();
        recordProviderSuccess('dashscope-voice', {
          operation: 'speech_to_text',
          mode: 'live',
          taskId,
          transcriptLength: transcript.length,
        });
        return transcript;
      }

      if (status === 'FAILED') {
        const errMsg = res && res.data && res.data.output && Array.isArray(res.data.output.results) && res.data.output.results[0]
          ? res.data.output.results[0].message || 'ASR task failed.'
          : 'ASR task failed.';
        throw createBizError(errMsg, 502, 502);
      }
    }
    throw createBizError('ASR task timed out.', 504, 504);
  }
}

module.exports = new VoiceService();
