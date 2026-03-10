'use strict';

const axios = require('axios');
const { getVoiceEnv, validateVoiceEnv } = require('../config/voiceEnv');

const TARGET_SPEED_WPM = 150;

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

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
      } catch (err) {
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
      throw createBizError(400, '文本内容不能为空', 400);
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
        throw createBizError(422, '语音合成结果为空', 422);
      }

      return audioBase64;
    } catch (err) {
      if (typeof err.code === 'number' && typeof err.statusCode === 'number') {
        throw err;
      }

      if (err.response) {
        console.error('阿里云TTS接口返回异常:', err.response.status);
        throw createBizError(502, '语音合成服务暂时不可用，请稍后重试', 502);
      }

      if (err.request) {
        console.error('阿里云TTS接口请求失败:', err.message);
        throw createBizError(504, '语音合成服务请求超时，请稍后重试', 504);
      }

      console.error('阿里云TTS处理失败:', err.message);
      throw createBizError(500, '语音合成处理失败', 500);
    }
  },
};

module.exports = ttsService;
