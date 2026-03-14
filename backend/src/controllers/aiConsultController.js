'use strict';

const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/aiService');
const voiceService = require('../services/voiceService');
const contentSafetyService = require('../services/contentSafetyService');
const ConsultRecord = require('../models/consultRecord');
const HealthProfile = require('../models/healthProfile');
const { ok, fail } = require('../utils/response');
const logger = require('../utils/logger');
function handleError(res, err) {
  if (err && (err.code || err.statusCode)) {
    const code = err.code || err.statusCode;
    const status = err.statusCode || code;
    return fail(res, code, err.message, err.data || null, status);
  }

  return fail(res, 500, 'Internal server error.', null, 500);
}

function parseLimit(value) {
  const raw = Number(value || 50);
  if (!Number.isInteger(raw) || raw <= 0) {
    return 50;
  }
  return Math.min(raw, 100);
}

function buildSafetyPayload(safetyResult) {
  return {
    safe: Boolean(safetyResult && safetyResult.safe),
    riskType: safetyResult ? safetyResult.riskType : null,
    riskLevel: safetyResult ? safetyResult.riskLevel : null,
    matchedKeyword: safetyResult ? safetyResult.matchedKeyword || null : null,
    triage:
      safetyResult && safetyResult.triage
        ? {
            allowResponse: Boolean(safetyResult.triage.allowResponse),
            needsManualFollowup: Boolean(safetyResult.triage.needsManualFollowup),
            recommendation: safetyResult.triage.recommendation || null,
          }
        : {
            allowResponse: true,
            needsManualFollowup: false,
            recommendation: 'No additional manual follow-up is required.',
          },
  };
}

function enrichReply(reply, safetyResult) {
  const safeReply = String(reply || '').trim();
  const suffix =
    safetyResult && safetyResult.triage && safetyResult.triage.responseSuffix
      ? String(safetyResult.triage.responseSuffix).trim()
      : '';

  if (!suffix) {
    return safeReply;
  }

  if (safeReply.includes(suffix)) {
    return safeReply;
  }

  return `${safeReply}\n\n${suffix}`.trim();
}

async function sendChat(req, res) {
  try {
    const userId = req.user.userId;
    const { message, sessionId: reqSessionId } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return fail(res, 422, 'message is required.', null, 422);
    }

    const sessionId = reqSessionId || uuidv4();
    const text = message.trim();

    const safetyResult = await contentSafetyService.check(text, userId);
    if (!safetyResult.safe || !safetyResult.triage.allowResponse) {
      return fail(res, 403, 'Message requires manual follow-up.', {
        safety: buildSafetyPayload(safetyResult),
        manualFollowupSuggested: true,
      }, 403);
    }

    const result = await aiService.chat(userId, text, sessionId);

    return ok(
      res,
      {
        reply: enrichReply(result.reply, safetyResult),
        sessionId: result.sessionId,
        tokens: result.tokens,
        safety: buildSafetyPayload(safetyResult),
        diagnostics: result.diagnostics,
        manualFollowupSuggested: Boolean(safetyResult.triage.needsManualFollowup),
      },
      'success'
    );
  } catch (err) {
    return handleError(res, err);
  }
}

async function getHistory(req, res) {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.query;
    const limit = parseLimit(req.query.limit);

    const records = sessionId
      ? await ConsultRecord.findBySession(userId, sessionId, limit)
      : await ConsultRecord.findByUser(userId, limit);

    return ok(res, { records }, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

async function clearHistory(req, res) {
  try {
    const userId = req.user.userId;
    const sessionId = req.body && req.body.sessionId ? String(req.body.sessionId).trim() : '';

    const deleted = sessionId
      ? await ConsultRecord.deleteBySession(userId, sessionId)
      : await ConsultRecord.deleteByUser(userId);

    return ok(res, { deleted }, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

async function voiceConsult(req, res) {
  try {
    const userId = req.user.userId;
    const { audioData, sessionId: reqSessionId } = req.body || {};

    if (!audioData || typeof audioData !== 'string' || !audioData.trim()) {
      return fail(res, 422, 'audioData is required.', null, 422);
    }

    const sessionId = reqSessionId || uuidv4();

    let recognizedText;
    try {
      recognizedText = await voiceService.speechToText(audioData);
    } catch (asrErr) {
      return handleError(res, asrErr);
    }

    if (!recognizedText || !recognizedText.trim()) {
      return fail(res, 422, 'Unable to recognize voice content.', null, 422);
    }

    const text = recognizedText.trim();
    const safetyResult = await contentSafetyService.check(text, userId);
    if (!safetyResult.safe || !safetyResult.triage.allowResponse) {
      return fail(res, 403, 'Message requires manual follow-up.', {
        recognizedText: text,
        safety: buildSafetyPayload(safetyResult),
        manualFollowupSuggested: true,
      }, 403);
    }

    const aiResult = await aiService.chat(userId, text, sessionId);
    const enrichedReply = enrichReply(aiResult.reply, safetyResult);

    let replyAudio = null;
    try {
      replyAudio = await voiceService.textToSpeech(enrichedReply);
    } catch (ttsErr) {
      logger.warn('aiConsultController', 'voice_tts_failed', { requestId: req.requestId || null, error: ttsErr.message });
    }

    return ok(
      res,
      {
        reply: enrichedReply,
        audioData: replyAudio,
        sessionId: aiResult.sessionId,
        text,
        safety: buildSafetyPayload(safetyResult),
        diagnostics: aiResult.diagnostics,
        manualFollowupSuggested: Boolean(safetyResult.triage.needsManualFollowup),
      },
      'success'
    );
  } catch (err) {
    return handleError(res, err);
  }
}

async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const profile = await HealthProfile.findByUserId(userId);

    return ok(res, { profile: profile || null }, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { age, gender, chronicDiseases, allergies, recentIndicators, currentMedications } =
      req.body || {};

    if (age !== undefined && (typeof age !== 'number' || age < 0 || age > 150)) {
      return fail(res, 422, 'age must be within 0-150.', null, 422);
    }

    if (gender !== undefined && !['male', 'female', 'other'].includes(gender)) {
      return fail(res, 422, 'gender must be one of male/female/other.', null, 422);
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
    return ok(res, { profile }, 'success');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  sendChat,
  getHistory,
  clearHistory,
  voiceConsult,
  getProfile,
  updateProfile,
};




