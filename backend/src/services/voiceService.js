'use strict';

const axios = require('axios');
const ossService = require('./ossService');

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

function requireDashScopeKey() {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) {
    const err = new Error('DashScope API key is not configured.');
    err.code = 503;
    err.statusCode = 503;
    throw err;
  }
  return key;
}

class VoiceService {
  async speechToText(audioBase64) {
    const apiKey = requireDashScopeKey();
    const audioUrl = await this._uploadAudioToOSS(audioBase64);

    const submitRes = await axios.post(
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
        timeout: 15000,
      }
    );

    const taskId = submitRes.data?.output?.task_id;
    if (!taskId) {
      const err = new Error('ASR task submission failed.');
      err.code = 502;
      err.statusCode = 502;
      throw err;
    }

    return this._pollAsrTask(taskId, apiKey);
  }

  async textToSpeech(text) {
    const apiKey = requireDashScopeKey();

    const res = await axios.post(
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
        timeout: 15000,
      }
    );

    const audioUrl = res.data?.output?.audio?.url;
    if (!audioUrl) {
      const err = new Error('TTS response does not contain audio url.');
      err.code = 502;
      err.statusCode = 502;
      throw err;
    }

    const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(audioRes.data).toString('base64');
  }

  async _uploadAudioToOSS(audioBase64) {
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      const err = new Error('audioData is required.');
      err.code = 400;
      err.statusCode = 400;
      throw err;
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const key = `voice/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`;
    return ossService.uploadAudio(buffer, key);
  }

  async _pollAsrTask(taskId, apiKey, maxRetries = 30, intervalMs = 1000) {
    for (let i = 0; i < maxRetries; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      const res = await axios.get(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });

      const status = res.data?.output?.task_status;

      if (status === 'SUCCEEDED') {
        const transcriptionUrl = res.data?.output?.results?.[0]?.transcription_url;
        if (!transcriptionUrl) {
          const err = new Error('ASR task finished without transcription url.');
          err.code = 502;
          err.statusCode = 502;
          throw err;
        }

        const transcRes = await axios.get(transcriptionUrl, { timeout: 10000 });
        const segments = transcRes.data?.transcripts || [];
        return segments.map((segment) => segment.text || segment.transcript || '').join(' ').trim();
      }

      if (status === 'FAILED') {
        const errMsg = res.data?.output?.results?.[0]?.message || 'ASR task failed.';
        const err = new Error(errMsg);
        err.code = 502;
        err.statusCode = 502;
        throw err;
      }
    }

    const timeoutError = new Error('ASR task timeout.');
    timeoutError.code = 504;
    timeoutError.statusCode = 504;
    throw timeoutError;
  }
}

module.exports = new VoiceService();
