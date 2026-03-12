'use strict';

const redis = require('../config/redis');
const CompanionModel = require('../models/companion');
const AuditLogModel = require('../models/auditLog');
const qwenService = require('./qwenService');
const emotionService = require('./emotionService');
const contentSafetyService = require('./contentSafetyService');
const { resolveIntegrationMode } = require('../config/integrationMode');
const { mergeProviderRuntime, recordProviderSuccess } = require('../utils/providerRuntime');
const logger = require('../utils/logger');

const CONTEXT_PREFIX = 'companion:context:';
const CONTEXT_MAX_MESSAGES = 10;
const CONTEXT_EXPIRE_SECONDS = 7 * 24 * 60 * 60;
const TREND_DAYS = 30;
const DEFAULT_DECADE = '1980s';
const SYSTEM_PROMPT =
  'You are a warm companion for older adults. Reply in concise, friendly, empathetic Chinese without medical jargon.';

const game = (gameType, name, description, rules) => ({
  gameType,
  name,
  description,
  rules,
  difficulties: [1, 2, 3, 4, 5],
});
const songs = (...items) => items.map(([title, artist]) => ({ title, artist }));
const movies = (...items) => items.map(([title, year]) => ({ title, year }));
const photos = (...items) => items.map(([title, description]) => ({ title, description }));
const nostalgia = (songList, movieList, photoList) => ({
  songs: songList,
  movies: movieList,
  photos: photoList,
});

const GAME_LIST = [
  game('memory', '数字记忆', '短时记忆训练，帮助保持注意力和记忆力。', '系统展示一组数字，短暂记忆后按顺序输入。'),
  game('word_chain', '词语接龙', '语言联想训练，帮助保持思维活跃。', '根据上一个词的末字接出下一个词。'),
  game('puzzle', '拼图', '空间认知训练，帮助保持专注和耐心。', '在限定时间内完成图块拼接。'),
];

const NOSTALGIA_LIBRARY = {
  '1950s': nostalgia(
    songs(['南泥湾', '郭兰英'], ['让我们荡起双桨', '刘惠芳'], ['我的祖国', '郭兰英']),
    movies(['白毛女', 1951], ['上甘岭', 1956], ['林家铺子', 1959]),
    photos(['老式收音机', '木质机身与旋钮调频，是很多家庭共同的时代记忆。'], ['胡同生活照', '邻里围坐聊天，充满烟火气。'])
  ),
  '1960s': nostalgia(
    songs(['草原上升起不落的太阳', '胡松华'], ['洪湖水浪打浪', '王玉珍'], ['学习雷锋好榜样', '合唱']),
    movies(['英雄儿女', 1964], ['地道战', 1965], ['小兵张嘎', 1963]),
    photos(['黑白全家福', '翻领衬衫和中山装是那个年代常见穿着。'], ['老式自行车', '二八大杠是很多人的通勤主力。'])
  ),
  '1970s': nostalgia(
    songs(['红星歌', '少年广播合唱团'], ['我爱你中国', '叶佩英'], ['边疆的泉水清又纯', '李谷一']),
    movies(['闪闪的红星', 1974], ['小花', 1979], ['庐山恋', 1980]),
    photos(['搪瓷缸', '常见的生活用品，承载了很多家庭回忆。'], ['工厂车间照', '记录了那个年代朴素而热烈的劳动场景。'])
  ),
  '1980s': nostalgia(
    songs(['年轻的朋友来相会', '李谷一'], ['外婆的澎湖湾', '潘安邦'], ['甜蜜蜜', '邓丽君']),
    movies(['牧马人', 1982], ['少林寺', 1982], ['高山下的花环', 1984]),
    photos(['大头电视机', '一家人围坐看电视是很多人的共同记忆。'], ['老式录音机', '磁带时代的音乐回忆。'])
  ),
  '1990s': nostalgia(
    songs(['涛声依旧', '毛宁'], ['同桌的你', '老狼'], ['千千阙歌', '陈慧娴']),
    movies(['霸王别姬', 1993], ['阳光灿烂的日子', 1994], ['一个都不能少', 1999]),
    photos(['录像厅海报墙', '周末观影娱乐的热门去处。'], ['街机厅', '游戏机和青春记忆交织在一起。'])
  ),
};

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

const getModeStrategy = () =>
  resolveIntegrationMode({
    requestedMode: process.env.AI_COMPANION_MODE || process.env.DASHSCOPE_MODE || 'auto',
    liveConfigured: Boolean(String(process.env.DASHSCOPE_API_KEY || '').trim()),
  });
const formatDate = (dateObj) => dateObj.toISOString().slice(0, 10);
const trimContext = (messages) =>
  (Array.isArray(messages) ? messages : []).slice(-CONTEXT_MAX_MESSAGES);
const logBestEffort = (action, err) =>
  logger.warn('companionService', action, { error: err.message });

function normalizeDecade(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return DEFAULT_DECADE;
  if (/^19(50|60|70|80|90)s$/.test(raw)) return raw;
  if (/^(50|60|70|80|90)年代$/.test(raw)) return `19${raw.slice(0, 2)}s`;
  if (/^(1950|1960|1970|1980|1990)$/.test(raw)) return `${raw}s`;
  return /^(50|60|70|80|90)s$/.test(raw) ? `19${raw}` : DEFAULT_DECADE;
}

async function getContextMessages(userId) {
  try {
    const parsed = JSON.parse((await redis.get(`${CONTEXT_PREFIX}${userId}`)) || '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && item.role && item.content)
          .map((item) => ({ role: item.role, content: String(item.content) }))
      : [];
  } catch (err) {
    logBestEffort('context_read_failed', err);
    return [];
  }
}

async function saveContextMessages(userId, messages) {
  const finalMessages = trimContext(messages);
  try {
    await redis.set(
      `${CONTEXT_PREFIX}${userId}`,
      JSON.stringify(finalMessages),
      'EX',
      CONTEXT_EXPIRE_SECONDS
    );
  } catch (err) {
    logBestEffort('context_write_failed', err);
  }
  return finalMessages;
}

function buildFallbackReply(message, safetyResult) {
  const prompt = String(message || '').trim();
  const suffix =
    safetyResult && safetyResult.triage && safetyResult.triage.responseSuffix
      ? ` ${safetyResult.triage.responseSuffix}`
      : '';

  return `I am here with you. For "${prompt}", let's take it one step at a time. You can drink some water, slow your breathing, and talk with a family member or caregiver if you want company.${suffix}`.trim();
}

async function writeAudit(action, details) {
  try {
    await AuditLogModel.create({
      userId: details && details.userId ? Number(details.userId) : null,
      action,
      details,
    });
  } catch (err) {
    logger.error('companionService', 'audit_failed', { action, error: err.message });
  }
}

function getDiagnostics(strategy, fallbackUsed) {
  const stub = fallbackUsed || strategy.effectiveMode !== 'live';
  return {
    mode: stub ? 'stub' : 'live',
    source: stub ? 'companion_stub' : 'dashscope_live',
    fallbackUsed,
  };
}

function validateGamePayload(payload) {
  const gameType = String(payload.gameType || '').trim();
  const score = Number(payload.score);
  const difficulty = Number(payload.difficulty);
  const durationSeconds = Number(payload.durationSeconds);
  const gameTypes = GAME_LIST.map((item) => item.gameType);

  if (!gameTypes.includes(gameType)) {
    throw createBizError(422, `gameType only supports ${gameTypes.join(', ')}`, 422);
  }
  if (!Number.isFinite(score) || score < 0) {
    throw createBizError(422, 'score must be greater than or equal to 0.', 422);
  }
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    throw createBizError(422, 'difficulty must be an integer between 1 and 5.', 422);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw createBizError(422, 'durationSeconds must be greater than or equal to 0.', 422);
  }

  return { gameType, score, difficulty, durationSeconds };
}

class CompanionService {
  getCapabilityReport() {
    const strategy = getModeStrategy();
    return mergeProviderRuntime('dashscope-ai-companion', {
      requestedMode: strategy.requestedMode,
      effectiveMode: strategy.effectiveMode,
      liveConfigured: strategy.liveConfigured,
      fallbackAllowed: strategy.fallbackAllowed,
      runtimeMode: strategy.runtimeMode,
    });
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
      recordProviderSuccess('dashscope-ai-companion', { operation: 'chat', mode: 'live', model: qwenResult.model, tokens: qwenResult.tokens || 0, requestId: qwenResult.requestId || null });
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
        {
          avgScore: Number(row.avg_score),
          recordCount: Number(row.record_count),
        },
      ])
    );

    const points = Array.from({ length: TREND_DAYS }, (_item, index) => {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - (TREND_DAYS - 1 - index));
      const date = formatDate(dateObj);
      const found = rowMap.get(date);
      return {
        date,
        avgScore: found ? found.avgScore : null,
        recordCount: found ? found.recordCount : 0,
      };
    });

    return {
      windowDays: TREND_DAYS,
      points,
      metrics: emotionService.calculateTrendMetrics(points),
    };
  }

  async getNostalgia(decade, userId) {
    const decadeKey = normalizeDecade(decade);
    const data = NOSTALGIA_LIBRARY[decadeKey] || NOSTALGIA_LIBRARY[DEFAULT_DECADE];

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



