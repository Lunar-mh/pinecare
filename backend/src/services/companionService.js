'use strict';

const CompanionModel = require('../models/companion');
const qwenService = require('./qwenService');
const emotionService = require('./emotionService');
const contentSafetyService = require('./contentSafetyService');
const { recordProviderSuccess } = require('../utils/providerRuntime');
const { buildCapabilityReport } = require('./integrationCapability/buildReport');
const { GAME_LIST, NOSTALGIA_LIBRARY } = require('./companion/content');
const { getContextMessages, saveContextMessages } = require('./companion/contextStore');
const {
  createBizError,
  getModeStrategy,
  normalizeDecade,
  buildFallbackReply,
  writeAudit,
  getDiagnostics,
  validateGamePayload,
} = require('./companion/shared');

const TREND_DAYS = 30;
const SYSTEM_PROMPT = 'You are a warm companion for older adults. Reply in concise, friendly, empathetic Chinese without medical jargon.';
const formatDate = (dateObj) => dateObj.toISOString().slice(0, 10);

class CompanionService {
  getCapabilityReport() {
    return buildCapabilityReport('dashscope-ai-companion', getModeStrategy());
  }

  async chat(userId, message) {
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      throw createBizError(422, 'Message cannot be empty.', 422);
    }

    const safetyResult = await contentSafetyService.check(cleanMessage, userId);
    if (!safetyResult.safe || !safetyResult.triage.allowResponse) {
      await writeAudit('companion.chat.blocked', {
        userId,
        riskType: safetyResult.riskType,
        riskLevel: safetyResult.riskLevel,
        matchedKeyword: safetyResult.matchedKeyword || null,
      });
      const err = createBizError(403, 'Message requires manual follow-up.', 403);
      err.data = {
        safety: safetyResult,
        manualFollowupSuggested: true,
      };
      throw err;
    }

    const contextMessages = await getContextMessages(userId);
    const strategy = getModeStrategy();
    let qwenResult;
    let fallbackUsed = false;

    if (strategy.effectiveMode === 'live') {
      try {
        qwenResult = await qwenService.chatWithQwen(
          [
            { role: 'system', content: SYSTEM_PROMPT },
            ...contextMessages,
            { role: 'user', content: cleanMessage },
          ],
          userId
        );
      } catch (err) {
        if (!strategy.fallbackAllowed) {
          throw err;
        }
        fallbackUsed = true;
        qwenResult = {
          reply: buildFallbackReply(cleanMessage, safetyResult),
          model: 'companion-stub',
          tokens: 0,
        };
        await writeAudit('companion.chat.fallback', {
          userId,
          requestedMode: strategy.requestedMode,
          effectiveMode: strategy.effectiveMode,
          fallbackReason: err.message,
        });
      }
    } else {
      if (!strategy.stubAllowed) {
        throw createBizError(503, 'AI companion stub mode is disabled in PRODUCTION_LIVE mode.', 503);
      }
      qwenResult = {
        reply: buildFallbackReply(cleanMessage, safetyResult),
        model: 'companion-stub',
        tokens: 0,
      };
    }

    if (strategy.effectiveMode === 'live' && !fallbackUsed) {
      recordProviderSuccess('dashscope-ai-companion', {
        operation: 'chat',
        mode: 'live',
        model: qwenResult.model,
        tokens: qwenResult.tokens || 0,
        requestId: qwenResult.requestId || null,
      });
    }

    const emotionScore = emotionService.analyzeDialogEmotion(cleanMessage, qwenResult.reply);
    const nextContext = await saveContextMessages(userId, [
      ...contextMessages,
      { role: 'user', content: cleanMessage },
      { role: 'assistant', content: qwenResult.reply },
    ]);

    await CompanionModel.createChatSession({
      userId,
      message: cleanMessage,
      reply: qwenResult.reply,
      emotionScore,
      sessionType: 'chat',
    });
    await CompanionModel.upsertEmotionTrackByDate(userId, new Date(), emotionScore);

    return {
      reply: qwenResult.reply,
      emotionScore,
      model: qwenResult.model,
      tokens: qwenResult.tokens,
      contextCount: nextContext.length,
      safety: {
        safe: safetyResult.safe,
        riskType: safetyResult.riskType,
        riskLevel: safetyResult.riskLevel,
        triage: safetyResult.triage,
      },
      diagnostics: getDiagnostics(strategy, fallbackUsed),
    };
  }

  getGames() {
    return GAME_LIST;
  }

  async recordGame(userId, payload) {
    const normalized = validateGamePayload(payload);
    const recordId = await CompanionModel.createGameRecord(userId, normalized);
    const bestScore = (await CompanionModel.listGameRecordsByUser(userId, 20))
      .filter((item) => item.game_type === normalized.gameType)
      .reduce((max, item) => Math.max(max, Number(item.score || 0)), 0);
    return { recordId, ...normalized, bestScore };
  }

  async getEmotionTrend(userId) {
    const rowMap = new Map(
      (await CompanionModel.getEmotionTracksByDays(userId, TREND_DAYS)).map((row) => [
        formatDate(new Date(row.track_date)),
        { avgScore: Number(row.avg_score), recordCount: Number(row.record_count) },
      ])
    );

    const points = Array.from({ length: TREND_DAYS }, (_item, index) => {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - (TREND_DAYS - 1 - index));
      const date = formatDate(dateObj);
      const found = rowMap.get(date);
      return { date, avgScore: found ? found.avgScore : null, recordCount: found ? found.recordCount : 0 };
    });

    return {
      windowDays: TREND_DAYS,
      points,
      metrics: emotionService.calculateTrendMetrics(points),
    };
  }

  async getNostalgia(decade, userId) {
    const decadeKey = normalizeDecade(decade);
    const data = NOSTALGIA_LIBRARY[decadeKey] || NOSTALGIA_LIBRARY['1980s'];

    if (userId) {
      await CompanionModel.createChatSession({
        userId,
        message: `怀旧推荐请求：${decadeKey}`,
        reply: `为您推荐 ${decadeKey} 的怀旧内容：老歌 ${data.songs.length} 首、老电影 ${data.movies.length} 部、老照片 ${data.photos.length} 组。`,
        emotionScore: 50,
        sessionType: 'nostalgia',
      });
    }

    return {
      decade: decadeKey,
      songs: data.songs,
      movies: data.movies,
      photos: data.photos,
    };
  }
}

const companionService = new CompanionService();

module.exports = companionService;
module.exports.CompanionService = CompanionService;
module.exports.GAME_LIST = GAME_LIST;
module.exports.NOSTALGIA_LIBRARY = NOSTALGIA_LIBRARY;
module.exports.createBizError = createBizError;
