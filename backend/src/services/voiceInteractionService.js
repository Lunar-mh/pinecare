'use strict';

const VoiceModel = require('../models/voice');
const asrService = require('./asrService');
const ttsService = require('./ttsService');

const WAKE_WORD = '银伴银伴';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function toPagination(page, pageSize) {
  const parsedPage = Number(page);
  const parsedPageSize = Number(pageSize);

  const finalPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;
  const finalPageSize =
    Number.isInteger(parsedPageSize) && parsedPageSize > 0
      ? Math.min(parsedPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page: finalPage,
    pageSize: finalPageSize,
    offset: (finalPage - 1) * finalPageSize,
    limit: finalPageSize,
  };
}

async function ensureSessionForUser(userId, sessionId) {
  if (!sessionId) {
    const newSessionId = await VoiceModel.createSession(userId);
    return VoiceModel.getSessionById(newSessionId);
  }

  const numericSessionId = Number(sessionId);
  if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
    throw createBizError(400, 'sessionId 必须为正整数', 400);
  }

  const session = await VoiceModel.getSessionByIdAndUser(numericSessionId, userId);
  if (!session) {
    throw createBizError(403, '无权访问该语音会话', 403);
  }

  return session;
}

const voiceInteractionService = {
  async recognize(userId, payload) {
    const audioData = payload ? payload.audioData : null;
    const reqSessionId = payload ? payload.sessionId : null;

    if (!audioData || typeof audioData !== 'string' || audioData.trim() === '') {
      throw createBizError(400, '音频数据不能为空', 400);
    }

    const session = await ensureSessionForUser(userId, reqSessionId);

    try {
      const recognizedText = await asrService.recognize(audioData.trim());

      if (!recognizedText.includes(WAKE_WORD)) {
        await VoiceModel.createCommandLog({
          sessionId: session.id,
          userId,
          commandType: 'recognize',
          recognizedText,
          responseText: `未检测到唤醒词“${WAKE_WORD}”`,
          status: 'failed',
        });

        const wakeWordError = createBizError(422, `请先说出唤醒词“${WAKE_WORD}”`, 422);
        wakeWordError.__alreadyLogged = true;
        throw wakeWordError;
      }

      await VoiceModel.incrementRoundCount(session.id);
      await VoiceModel.createCommandLog({
        sessionId: session.id,
        userId,
        commandType: 'recognize',
        recognizedText,
        status: 'success',
      });

      const latestSession = await VoiceModel.getSessionById(session.id);

      return {
        sessionId: session.id,
        recognizedText,
        wakeWord: WAKE_WORD,
        roundCount: latestSession ? latestSession.round_count : session.round_count + 1,
      };
    } catch (err) {
      if (!err.__alreadyLogged) {
        await VoiceModel.createCommandLog({
          sessionId: session.id,
          userId,
          commandType: 'recognize',
          responseText: err.message || '语音识别失败',
          status: 'failed',
        });
      }

      if (typeof err.code === 'number' && typeof err.statusCode === 'number') {
        throw err;
      }
      throw createBizError(500, '语音识别流程处理失败', 500);
    }
  },

  async synthesize(userId, payload) {
    const text = payload ? payload.text : null;
    const reqSessionId = payload ? payload.sessionId : null;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw createBizError(400, '待合成文本不能为空', 400);
    }

    const session = await ensureSessionForUser(userId, reqSessionId);

    try {
      const audioData = await ttsService.synthesize(text.trim());

      await VoiceModel.incrementRoundCount(session.id);
      await VoiceModel.createCommandLog({
        sessionId: session.id,
        userId,
        commandType: 'synthesize',
        responseText: text.trim(),
        audioData,
        status: 'success',
      });

      const latestSession = await VoiceModel.getSessionById(session.id);

      return {
        sessionId: session.id,
        text: text.trim(),
        audioData,
        audioFormat: 'mp3',
        roundCount: latestSession ? latestSession.round_count : session.round_count + 1,
      };
    } catch (err) {
      await VoiceModel.createCommandLog({
        sessionId: session.id,
        userId,
        commandType: 'synthesize',
        responseText: text.trim(),
        status: 'failed',
      });

      if (typeof err.code === 'number' && typeof err.statusCode === 'number') {
        throw err;
      }
      throw createBizError(500, '语音合成流程处理失败', 500);
    }
  },

  async getSessions(userId, query) {
    const pagination = toPagination(query ? query.page : null, query ? query.pageSize : null);

    const [list, total] = await Promise.all([
      VoiceModel.getSessionsByUser(userId, pagination),
      VoiceModel.countSessionsByUser(userId),
    ]);

    return {
      list,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  },

  async getSessionLogs(userId, sessionId, query) {
    const numericSessionId = Number(sessionId);
    if (!Number.isInteger(numericSessionId) || numericSessionId <= 0) {
      throw createBizError(400, 'sessionId 必须为正整数', 400);
    }

    const session = await VoiceModel.getSessionByIdAndUser(numericSessionId, userId);
    if (!session) {
      throw createBizError(403, '无权访问该语音会话日志', 403);
    }

    const pagination = toPagination(query ? query.page : null, query ? query.pageSize : null);

    const [list, total] = await Promise.all([
      VoiceModel.getLogsBySession(numericSessionId, pagination),
      VoiceModel.countLogsBySession(numericSessionId),
    ]);

    return {
      session,
      list,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  },
};

module.exports = voiceInteractionService;
