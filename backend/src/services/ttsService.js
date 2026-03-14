'use strict';

const axios = require('axios');
const { getVoiceEnv, validateVoiceEnv } = require('../config/voiceEnv');
const logger = require('../utils/logger');
const { createBizError } = require('../utils/serviceError');

const TARGET_SPEED_WPM = 150;


function getSpeechRateByWpm(wpm) {
  const baseWpm = 300;
  const scale = 5;
  return Math.max(-500, Math.min(500, Math.round((wpm - baseWpm) * scale)));
}

function parseAudioBase64FromData(data) {
  if (!data) {
    return '';
  }

  if (typeof data === 'string') {
    const normalized = data.trim();
    if (normalized.startsWith('{') || normalized.startsWith('[')) {
      try {
        const parsed = JSON.parse(normalized);
        return parseAudioBase64FromData(parsed);
      } catch (_err) {
        return normalized;
      }
    }
    return normalized;
  }

  if (Buffer.isBuffer(data)) {
    return data.toString('base64');
  }

  if (data.audio_data) {
    return String(data.audio_data).trim();
  }

  if (data.audioData) {
    return String(data.audioData).trim();
  }

  if (data.result && data.result.audio_data) {
    return String(data.result.audio_data).trim();
  }

  if (data.output && data.output.audio && data.output.audio.data) {
    return String(data.output.audio.data).trim();
  }

  return '';
}

const ttsService = {
  async synthesize(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw createBizError(400, 'text is required.', 400);
    }

    validateVoiceEnv();
    const env = getVoiceEnv();

    try {
      const response = await axios.post(
        env.ttsEndpoint,
        {
          text: text.trim(),
          format: 'mp3',
          voice: 'xiaoyun',
          sample_rate: 16000,
          speech_rate: getSpeechRateByWpm(TARGET_SPEED_WPM),
          target_wpm: TARGET_SPEED_WPM,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-acs-accesskey-id': env.accessKeyId,
            'x-acs-access-key-secret': env.accessKeySecret,
          },
          timeout: env.timeoutMs,
          responseType: 'arraybuffer',
        }
      );

      const contentType = String(response.headers['content-type'] || '').toLowerCase();
      let audioBase64 = '';

      if (contentType.includes('audio/')) {
        audioBase64 = Buffer.from(response.data).toString('base64');
      } else {
        const raw = Buffer.isBuffer(response.data)
          ? response.data.toString('utf8')
          : response.data;
        audioBase64 = parseAudioBase64FromData(raw);
      }

      if (!audioBase64) {
        throw createBizError(422, 'Speech synthesis returned empty audio.', 422);
      }

      return audioBase64;
    } catch (err) {
      if (typeof err.code === 'number' && typeof err.statusCode === 'number') {
        throw err;
      }

      if (err.response) {
        logger.error('ttsService', 'live_response_error', { status: err.response.status });
        throw createBizError(502, 'Speech synthesis service is temporarily unavailable.', 502);
      }

      if (err.request) {
        logger.error('ttsService', 'live_request_error', { message: err.message });
        throw createBizError(504, 'Speech synthesis request timed out.', 504);
      }

      logger.error('ttsService', 'synthesize_failed', { message: err.message });
      throw createBizError(500, 'Speech synthesis failed.', 500);
    }
  },
};

module.exports = ttsService;
