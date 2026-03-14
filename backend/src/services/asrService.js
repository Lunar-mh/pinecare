'use strict';

const axios = require('axios');
const { getVoiceEnv, validateVoiceEnv } = require('../config/voiceEnv');
const logger = require('../utils/logger');
const { createBizError } = require('../utils/serviceError');


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
      throw createBizError(400, 'audio data is required.', 400);
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
        throw createBizError(422, 'Speech recognition returned an empty transcript.', 422);
      }

      return recognizedText;
    } catch (err) {
      if (typeof err.code === 'number' && typeof err.statusCode === 'number') {
        throw err;
      }

      if (err.response) {
        logger.error('asrService', 'live_response_error', {
          status: err.response.status,
          data: err.response.data,
        });
        throw createBizError(502, 'Speech recognition service is temporarily unavailable.', 502);
      }

      if (err.request) {
        logger.error('asrService', 'live_request_error', { message: err.message });
        throw createBizError(504, 'Speech recognition request timed out.', 504);
      }

      logger.error('asrService', 'recognize_failed', { message: err.message });
      throw createBizError(500, 'Speech recognition failed.', 500);
    }
  },
};

module.exports = asrService;
