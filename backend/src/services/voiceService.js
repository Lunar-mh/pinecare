'use strict';

const axios = require('axios');

const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * 语音服务
 * ASR（语音识别）: 使用 Fun-ASR 录音文件识别（异步任务）
 * TTS（语音合成）: 使用 Qwen3-TTS-Flash（同步，返回音频URL）
 *
 * 重要约束:
 * - ASR 要求音频文件可公网访问的 URL，不支持直接上传 Base64
 *   生产环境需先将 Base64 音频上传至 OSS，获取公网URL后再调用 ASR
 *   本实现提供完整流程框架，uploadAudioToOSS 需接入实际 OSS 配置
 */
class VoiceService {
  /**
   * 语音识别（ASR）
   * @param {string} audioBase64 - Base64 编码的音频数据
   * @returns {Promise<string>} 识别文本
   */
  async speechToText(audioBase64) {
    // Step 1: 将 Base64 音频上传至可公网访问的临时存储
    // 生产环境需替换为实际的 OSS 上传逻辑
    const audioUrl = await this._uploadAudioToOSS(audioBase64);

    // Step 2: 提交 ASR 异步任务
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
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        timeout: 15000,
      }
    );

    const taskId = submitRes.data.output.task_id;

    // Step 3: 轮询任务状态（最多等待30秒）
    const transcription = await this._pollAsrTask(taskId);
    return transcription;
  }

  /**
   * 语音合成（TTS）
   * @param {string} text - 要合成的文本
   * @returns {Promise<string>} Base64 编码的音频数据
   */
  async textToSpeech(text) {
    const res = await axios.post(
      `${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`,
      {
        model: 'qwen3-tts-flash',
        input: {
          text,
          voice: 'Cherry',           // 温柔女声
          language_type: 'Chinese',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const audioUrl = res.data.output.audio.url;

    // 下载音频并转换为 Base64（URL有效期24小时）
    const audioRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 10000 });
    const audioBase64 = Buffer.from(audioRes.data).toString('base64');
    return audioBase64;
  }

  /**
   * 将 Base64 音频上传到 OSS，返回公网可访问 URL
   * 生产环境需替换为实际 OSS 上传逻辑
   * @private
   */
  async _uploadAudioToOSS(audioBase64) {
    // TODO: 接入阿里云 OSS SDK 实现实际上传
    // const ossClient = new OSS({ ... });
    // const buffer = Buffer.from(audioBase64, 'base64');
    // const result = await ossClient.put(`voice/${Date.now()}.wav`, buffer);
    // return result.url;
    throw new Error('OSS 上传未配置，请在 voiceService._uploadAudioToOSS 中接入 OSS SDK');
  }

  /**
   * 轮询 ASR 任务状态
   * @private
   */
  async _pollAsrTask(taskId, maxRetries = 30, intervalMs = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));

      const res = await axios.get(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}` },
        timeout: 10000,
      });

      const status = res.data.output.task_status;

      if (status === 'SUCCEEDED') {
        const transcriptionUrl = res.data.output.results[0].transcription_url;
        const transcRes = await axios.get(transcriptionUrl, { timeout: 10000 });
        // 取第一段识别文字
        const segments = transcRes.data.transcripts || [];
        return segments.map((s) => s.text || s.transcript || '').join(' ').trim();
      }

      if (status === 'FAILED') {
        const errMsg =
          res.data.output.results &&
          res.data.output.results[0] &&
          res.data.output.results[0].message;
        throw new Error(`ASR 识别失败: ${errMsg || '未知错误'}`);
      }
    }

    throw new Error('ASR 任务超时');
  }
}

module.exports = new VoiceService();
