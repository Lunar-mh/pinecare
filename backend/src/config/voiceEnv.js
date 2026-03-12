'use strict';

const REQUIRED_VARS = ['ALIYUN_ACCESS_KEY_ID', 'ALIYUN_ACCESS_KEY_SECRET'];

function getVoiceEnv() {
  return {
    accessKeyId: (process.env.ALIYUN_ACCESS_KEY_ID || '').trim(),
    accessKeySecret: (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim(),
    asrEndpoint:
      process.env.ALIYUN_ASR_ENDPOINT || 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/asr',
    ttsEndpoint:
      process.env.ALIYUN_TTS_ENDPOINT || 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts',
    timeoutMs: Number(process.env.ALIYUN_VOICE_TIMEOUT_MS || 20000),
  };
}

function validateVoiceEnv() {
  const missing = REQUIRED_VARS.filter((name) => !(process.env[name] || '').trim());
  if (missing.length > 0) {
    const err = new Error(`Voice service requires env vars: ${missing.join(', ')}`);
    err.code = 500;
    err.statusCode = 500;
    throw err;
  }
}

module.exports = {
  getVoiceEnv,
  validateVoiceEnv,
};
