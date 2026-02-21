'use strict';

const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/aiService');
const voiceService = require('../services/voiceService');
const contentSafetyService = require('../services/contentSafetyService');
const ConsultRecord = require('../models/consultRecord');
const HealthProfile = require('../models/healthProfile');

/**
 * POST /ai-consult/chat
 * US1: 文字健康咨询
 *
 * body: { message: string, sessionId?: string }
 * response: { code: 200, message: 'success', data: { reply, sessionId, tokens } }
 */
async function sendChat(req, res, next) {
  try {
    const userId = req.user.userId;
    const { message, sessionId: reqSessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ code: 400, message: '消息内容不能为空', data: null });
    }

    const sessionId = reqSessionId || uuidv4();

    // T026: 内容安全检测 — 高风险拦截
    const safetyResult = await contentSafetyService.check(message.trim(), userId);
    if (!safetyResult.safe) {
      return res.status(403).json({
        code: 403,
        message: '您的消息包含不当内容，已转交关怀团队处理',
        data: null,
      });
    }

    // 调用 AI 服务（含健康上下文 + 历史 + DashScope 调用 + 记录持久化）
    const result = await aiService.chat(userId, message.trim(), sessionId);

    return res.json({
      code: 200,
      message: 'success',
      data: {
        reply: result.reply,
        sessionId: result.sessionId,
        tokens: result.tokens,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ai-consult/history
 * US1: 查询咨询历史
 *
 * query: { sessionId?: string, limit?: number }
 * response: { code: 200, message: 'success', data: { records: Array } }
 */
async function getHistory(req, res, next) {
  try {
    const userId = req.user.userId;
    const { sessionId, limit } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);

    let records;
    if (sessionId) {
      records = await ConsultRecord.findBySession(userId, sessionId, limitNum);
    } else {
      records = await ConsultRecord.findByUser(userId, limitNum);
    }

    return res.json({
      code: 200,
      message: 'success',
      data: { records },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /ai-consult/voice
 * US2: 语音健康咨询
 *
 * body: { audioData: string (base64), sessionId?: string }
 * response: { code: 200, message: 'success', data: { reply, audioData, sessionId, text } }
 */
async function voiceConsult(req, res, next) {
  try {
    const userId = req.user.userId;
    const { audioData, sessionId: reqSessionId } = req.body;

    if (!audioData || typeof audioData !== 'string' || audioData.trim() === '') {
      return res.status(400).json({ code: 400, message: '音频数据不能为空', data: null });
    }

    const sessionId = reqSessionId || uuidv4();

    // Step 1: ASR 语音识别
    let recognizedText;
    try {
      recognizedText = await voiceService.speechToText(audioData);
    } catch (asrErr) {
      return res.status(500).json({
        code: 500,
        message: `语音识别失败: ${asrErr.message}`,
        data: null,
      });
    }

    if (!recognizedText || recognizedText.trim() === '') {
      return res.status(422).json({ code: 422, message: '未能识别语音内容，请重新录音', data: null });
    }

    // T026: 内容安全检测（对识别后的文字）
    const safetyResult = await contentSafetyService.check(recognizedText.trim(), userId);
    if (!safetyResult.safe) {
      return res.status(403).json({
        code: 403,
        message: '您的消息包含不当内容，已转交关怀团队处理',
        data: null,
      });
    }

    // Step 2: AI 咨询
    const aiResult = await aiService.chat(userId, recognizedText.trim(), sessionId);

    // Step 3: TTS 语音合成
    let replyAudio = null;
    try {
      replyAudio = await voiceService.textToSpeech(aiResult.reply);
    } catch (ttsErr) {
      // TTS 失败不阻断，返回文字回复即可
      console.error('TTS 合成失败:', ttsErr.message);
    }

    return res.json({
      code: 200,
      message: 'success',
      data: {
        reply: aiResult.reply,
        audioData: replyAudio,
        sessionId: aiResult.sessionId,
        text: recognizedText,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ai-consult/profile
 * US3: 查询健康画像
 *
 * response: { code: 200, message: 'success', data: { profile } }
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const profile = await HealthProfile.findByUserId(userId);

    return res.json({
      code: 200,
      message: 'success',
      data: { profile: profile || null },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /ai-consult/profile
 * US3: 更新健康画像
 *
 * body: { age?, gender?, chronicDiseases?, allergies?, recentIndicators?, currentMedications? }
 * response: { code: 200, message: '健康画像已更新', data: { profile } }
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.userId;
    const { age, gender, chronicDiseases, allergies, recentIndicators, currentMedications } =
      req.body;

    // 基本字段校验
    if (age !== undefined && (typeof age !== 'number' || age < 0 || age > 150)) {
      return res.status(400).json({ code: 400, message: '年龄必须为 0-150 之间的数字', data: null });
    }
    if (gender !== undefined && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ code: 400, message: 'gender 必须为 male/female/other', data: null });
    }

    await HealthProfile.upsert(userId, {
      age,
      gender,
      chronicDiseases,
      allergies,
      recentIndicators,
      currentMedications,
    });

    const profile = await HealthProfile.findByUserId(userId);

    return res.json({
      code: 200,
      message: '健康画像已更新',
      data: { profile },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendChat,
  getHistory,
  voiceConsult,
  getProfile,
  updateProfile,
};
