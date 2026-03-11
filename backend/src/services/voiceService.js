'use strict';

const axios = require('axios');
const ossService = require('./ossService');
const {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
} = require('../utils/thirdParty');
const { isCompetitionSandbox, isProductionLive } = require('../config/runtimeMode');

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';
const REQUEST_TIMEOUT_MS = Number(process.env.VOICE_SERVICE_TIMEOUT_MS || 15000);
const MAX_RETRY = Math.max(0, Number(process.env.VOICE_SERVICE_MAX_RETRY || 2));

function createBizError(message, code = 503, statusCode = 503) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveMode() {
  return String(
    process.env.VOICE_SERVICE_MODE || process.env.DASHSCOPE_MODE || 'auto'
  ).toLowerCase();
}

function hasLiveConfig() {
  return Boolean(String(process.env.DASHSCOPE_API_KEY || '').trim());
}

function isLiveMode() {
  const mode = resolveMode();
  if (mode === 'live') return true;
  if (mode === 'stub' || mode === 'mock') return false;

  if (isProductionLive()) {
    return true;
  }

  return hasLiveConfig();
}

function toVoiceError(err) {
  return createUpstreamError(err, {
    timeout: 'Voice service timeout.',
    rateLimited: 'Voice service rate limited.',
    unavailable: 'Voice service unavailable.',
    failed: 'Voice service failed.',
  });
}

async function withRetry(operation, requestFactory) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      return await requestFactory();
    } catch (err) {
      lastError = err;
      logThirdPartyError('dashscope-voice', err, {
        operation,
        attempt: attempt + 1,
      });

      if (!isRetryableError(err) || attempt >= MAX_RETRY) {
        throw toVoiceError(err);
      }

      await sleep(100 * (attempt + 1));
    }
  }

  throw toVoiceError(lastError);
}

function requireDashScopeKey() {
  const key = String(process.env.DASHSCOPE_API_KEY || '').trim();
  if (!key) {
    throw createBizError('DashScope API key is not configured.', 503, 503);
  }
  return key;
}

function buildStubText() {
  return '您好，我可以继续为您分析当前健康问题。';
}

function buildStubAudio(text) {
  return Buffer.from(`stub-audio:${String(text || '').trim() || 'voice'}`, 'utf8').toString(
    'base64'
  );
}

class VoiceService {
  async speechToText(audioBase64) {
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw createBizError('audioData is required.', 400, 400);
    }

    if (!isLiveMode()) {
      if (isProductionLive() && !isCompetitionSandbox()) {
        throw createBizError('Voice stub mode is disabled in PRODUCTION_LIVE mode.', 503, 503);
      }

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
          parameters: {
            channel_id: [0],
            language_hints: ['zh', 'en'],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable',
          },
          timeout: REQUEST_TIMEOUT_MS,
        }
      )
    );

    const taskId =
      submitRes && submitRes.data && submitRes.data.output ? submitRes.data.output.task_id : null;
    if (!taskId) {
      throw createBizError('ASR task submission failed.', 502, 502);
    }

    return this._pollAsrTask(taskId, apiKey);
  }

  async textToSpeech(text) {
    if (!String(text || '').trim()) {
      throw createBizError('text is required.', 400, 400);
    }

    if (!isLiveMode()) {
      if (isProductionLive() && !isCompetitionSandbox()) {
        throw createBizError('Voice stub mode is disabled in PRODUCTION_LIVE mode.', 503, 503);
      }

      return buildStubAudio(text);
    }

    const apiKey = requireDashScopeKey();

    const res = await withRetry('textToSpeech.generate', () =>
      axios.post(
        `${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`,
        {
          model: 'qwen3-tts-flash',
          input: {
            text,
            voice: 'Cherry',
            language_type: 'Chinese',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT_MS,
        }
      )
    );

    const audioUrl =
      res && res.data && res.data.output && res.data.output.audio
        ? res.data.output.audio.url
        : null;
    if (!audioUrl) {
      throw createBizError('TTS response does not contain audio url.', 502, 502);
    }

    const audioRes = await withRetry('textToSpeech.download', () =>
      axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 10000 })
    );

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

      const res = await withRetry('speechToText.poll', () =>
        axios.get(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 10000,
        })
      );

      const status = res && res.data && res.data.output ? res.data.output.task_status : null;

      if (status === 'SUCCEEDED') {
        const transcriptionUrl =
          res &&
          res.data &&
          res.data.output &&
          Array.isArray(res.data.output.results) &&
          res.data.output.results[0]
            ? res.data.output.results[0].transcription_url
            : null;

        if (!transcriptionUrl) {
          throw createBizError('ASR task finished without transcription url.', 502, 502);
        }

        const transcRes = await withRetry('speechToText.transcript', () =>
          axios.get(transcriptionUrl, { timeout: 10000 })
        );

        const segments = Array.isArray(transcRes.data && transcRes.data.transcripts)
          ? transcRes.data.transcripts
          : [];
        return segments
          .map((segment) => segment.text || segment.transcript || '')
          .join(' ')
          .trim();
      }

      if (status === 'FAILED') {
        const errMsg =
          res &&
          res.data &&
          res.data.output &&
          Array.isArray(res.data.output.results) &&
          res.data.output.results[0]
            ? res.data.output.results[0].message || 'ASR task failed.'
            : 'ASR task failed.';

        throw createBizError(errMsg, 502, 502);
      }
    }

    throw createBizError('ASR task timeout.', 504, 504);
  }
}

module.exports = new VoiceService();
