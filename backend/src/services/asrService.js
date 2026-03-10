'use strict';

const axios = require('axios');
const { getVoiceEnv, validateVoiceEnv } = require('../config/voiceEnv');

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function extractRecognizedText(payload) {
  if (!payload) {
    return '';
  }

  if (typeof payload.text === 'string') {
    return payload.text.trim();
  }

  if (payload.result && typeof payload.result.text === 'string') {
    return payload.result.text.trim();
  }

  if (payload.output && typeof payload.output.text === 'string') {
    return payload.output.text.trim();
  }

  if (Array.isArray(payload.sentences)) {
    return payload.sentences
      .map((item) => (item && (item.text || item.transcript)) || '')
      .join(' ')
      .trim();
  }

  if (Array.isArray(payload.results)) {
    return payload.results
      .map((item) => (item && (item.text || item.transcript)) || '')
      .join(' ')
      .trim();
  }

  return '';
}

const asrService = {
  async recognize(audioBase64) {
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw createBizError(400, '音频数据不能为空', 400);
    }

    validateVoiceEnv();
    const env = getVoiceEnv();

    try {
      const response = await axios.post(
        env.asrEndpoint,
        {
          audio_data: audioBase64,
          format: 'wav',
          sample_rate: 16000,
          enable_punctuation_prediction: true,
          enable_inverse_text_normalization: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-acs-accesskey-id': env.accessKeyId,
            'x-acs-access-key-secret': env.accessKeySecret,
          },
          timeout: env.timeoutMs,
        }
      );

      const recognizedText = extractRecognizedText(response.data);
      if (!recognizedText) {
        throw createBizError(422, '语音识别结果为空', 422);
      }

      return recognizedText;
    } catch (err) {
      if (typeof err.code === 'number' && typeof err.statusCode === 'number') {
        throw err;
      }

      if (err.response) {
        console.error('阿里云ASR接口返回异常:', err.response.status, err.response.data);
        throw createBizError(502, '语音识别服务暂时不可用，请稍后重试', 502);
      }

      if (err.request) {
        console.error('阿里云ASR接口请求失败:', err.message);
        throw createBizError(504, '语音识别服务请求超时，请稍后重试', 504);
      }

      console.error('阿里云ASR处理失败:', err.message);
      throw createBizError(500, '语音识别处理失败', 500);
    }
  },
};

module.exports = asrService;
