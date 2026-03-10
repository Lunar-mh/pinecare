'use strict';

const redis = require('../config/redis');
const CompanionModel = require('../models/companion');
const qwenService = require('./qwenService');
const emotionService = require('./emotionService');

const CONTEXT_PREFIX = 'companion:context:';
const CONTEXT_MAX_MESSAGES = 10;
const CONTEXT_EXPIRE_SECONDS = 7 * 24 * 60 * 60;
const TREND_DAYS = 30;

const GAME_LIST = [
  {
    gameType: 'memory',
    name: '数字记忆',
    description: '短时记忆训练，逐步提升注意力和记忆力。',
    rules: '系统展示一组数字，短暂记忆后按顺序输入。',
    difficulties: [1, 2, 3, 4, 5],
  },
  {
    gameType: 'word_chain',
    name: '词语接龙',
    description: '语言联想训练，活跃思维。',
    rules: '根据上一词末字接出下一个词。',
    difficulties: [1, 2, 3, 4, 5],
  },
  {
    gameType: 'puzzle',
    name: '拼图',
    description: '空间认知训练，增强专注力。',
    rules: '在限定时间内完成图块拼接。',
    difficulties: [1, 2, 3, 4, 5],
  },
];

const NOSTALGIA_LIBRARY = {
  '1950s': {
    songs: [
      { title: '南泥湾', artist: '郭兰英' },
      { title: '让我们荡起双桨', artist: '刘慧芳' },
      { title: '我的祖国', artist: '郭兰英' },
    ],
    movies: [
      { title: '白毛女', year: 1951 },
      { title: '上甘岭', year: 1956 },
      { title: '林家铺子', year: 1959 },
    ],
    photos: [
      { title: '老式收音机', description: '木质机身，旋钮调频，家庭常见娱乐设备。' },
      { title: '胡同生活照', description: '邻里围坐聊天，烟火气十足。' },
    ],
  },
  '1960s': {
    songs: [
      { title: '草原上升起不落的太阳', artist: '胡松华' },
      { title: '洪湖水浪打浪', artist: '王玉珍' },
      { title: '学习雷锋好榜样', artist: '合唱' },
    ],
    movies: [
      { title: '英雄儿女', year: 1964 },
      { title: '地道战', year: 1965 },
      { title: '小兵张嘎', year: 1963 },
    ],
    photos: [
      { title: '黑白全家福', description: '翻领衬衣与中山装是当年流行穿着。' },
      { title: '老式自行车', description: '二八大杠是通勤主力。' },
    ],
  },
  '1970s': {
    songs: [
      { title: '红星歌', artist: '中央人民广播电台少年广播合唱团' },
      { title: '我爱你中国', artist: '叶佩英' },
      { title: '边疆的泉水清又纯', artist: '李谷一' },
    ],
    movies: [
      { title: '闪闪的红星', year: 1974 },
      { title: '小花', year: 1979 },
      { title: '庐山恋', year: 1980 },
    ],
    photos: [
      { title: '老式搪瓷杯', description: '家家户户常用的生活用品。' },
      { title: '工厂车间照', description: '记录了奋斗年代的劳动场景。' },
    ],
  },
  '1980s': {
    songs: [
      { title: '年轻的朋友来相会', artist: '李谷一' },
      { title: '外婆的澎湖湾', artist: '潘安邦' },
      { title: '甜蜜蜜', artist: '邓丽君' },
    ],
    movies: [
      { title: '牧马人', year: 1982 },
      { title: '少林寺', year: 1982 },
      { title: '高山下的花环', year: 1984 },
    ],
    photos: [
      { title: '大头电视机', description: '一家人围坐追剧的共同回忆。' },
      { title: '老式录音机', description: '磁带时代的音乐记忆。' },
    ],
  },
  '1990s': {
    songs: [
      { title: '涛声依旧', artist: '毛宁' },
      { title: '同桌的你', artist: '老狼' },
      { title: '千千阙歌', artist: '陈慧娴' },
    ],
    movies: [
      { title: '霸王别姬', year: 1993 },
      { title: '阳光灿烂的日子', year: 1994 },
      { title: '一个都不能少', year: 1999 },
    ],
    photos: [
      { title: '录像厅海报墙', description: '周末观影娱乐的热门去处。' },
      { title: '街机厅', description: '游戏机与青春记忆交织。' },
    ],
  },
};

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function formatDate(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

function normalizeDecade(input) {
  const raw = String(input || '').trim().toLowerCase();

  if (!raw) {
    return '1980s';
  }

  if (/^19(50|60|70|80|90)s$/.test(raw)) {
    return raw;
  }

  if (/^(50|60|70|80|90)年代$/.test(raw)) {
    return `19${raw.slice(0, 2)}s`;
  }

  if (/^(1950|1960|1970|1980|1990)$/.test(raw)) {
    return `${raw}s`;
  }

  if (/^(50|60|70|80|90)s$/.test(raw)) {
    return `19${raw}`;
  }

  return '1980s';
}

function trimContext(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages.slice(-CONTEXT_MAX_MESSAGES);
}

async function getContextMessages(userId) {
  const key = `${CONTEXT_PREFIX}${userId}`;

  try {
    const raw = await redis.get(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && item.role && item.content)
      .map((item) => ({ role: item.role, content: String(item.content) }));
  } catch (err) {
    console.error('读取陪伴上下文失败，将使用空上下文:', err.message);
    return [];
  }
}

async function saveContextMessages(userId, messages) {
  const key = `${CONTEXT_PREFIX}${userId}`;
  const finalMessages = trimContext(messages);

  try {
    await redis.set(key, JSON.stringify(finalMessages), 'EX', CONTEXT_EXPIRE_SECONDS);
  } catch (err) {
    console.error('写入陪伴上下文失败:', err.message);
  }

  return finalMessages;
}

class CompanionService {
  async chat(userId, message) {
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      throw createBizError(422, 'message 不能为空', 422);
    }

    const contextMessages = await getContextMessages(userId);
    const systemPrompt =
      '你是银伴平台的温暖陪伴助手，请用简洁、友善、共情的中文回复老年用户，避免专业术语，必要时给予积极鼓励。';

    const qwenMessages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
      { role: 'user', content: cleanMessage },
    ];

    const qwenResult = await qwenService.chatWithQwen(qwenMessages, userId);
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
    };
  }

  getGames() {
    return GAME_LIST;
  }

  async recordGame(userId, payload) {
    const gameType = String(payload.gameType || '').trim();
    const score = Number(payload.score);
    const difficulty = Number(payload.difficulty);
    const durationSeconds = Number(payload.durationSeconds);

    const gameTypes = GAME_LIST.map((item) => item.gameType);
    if (!gameTypes.includes(gameType)) {
      throw createBizError(422, `gameType 仅支持: ${gameTypes.join(', ')}`, 422);
    }

    if (!Number.isFinite(score) || score < 0) {
      throw createBizError(422, 'score 必须为大于等于 0 的数字', 422);
    }

    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      throw createBizError(422, 'difficulty 必须为 1-5 的整数', 422);
    }

    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      throw createBizError(422, 'durationSeconds 必须为大于等于 0 的数字', 422);
    }

    const recordId = await CompanionModel.createGameRecord(userId, {
      gameType,
      score,
      difficulty,
      durationSeconds,
    });

    const recentRecords = await CompanionModel.listGameRecordsByUser(userId, 20);
    const sameGameRecords = recentRecords.filter((item) => item.game_type === gameType);
    const bestScore = sameGameRecords.reduce((max, item) => Math.max(max, Number(item.score || 0)), 0);

    return {
      recordId,
      gameType,
      score,
      difficulty,
      durationSeconds,
      bestScore,
    };
  }

  async getEmotionTrend(userId) {
    const rows = await CompanionModel.getEmotionTracksByDays(userId, TREND_DAYS);
    const rowMap = new Map();

    rows.forEach((row) => {
      rowMap.set(formatDate(new Date(row.track_date)), {
        avgScore: Number(row.avg_score),
        recordCount: Number(row.record_count),
      });
    });

    const points = [];
    for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - i);
      const date = formatDate(dateObj);
      const found = rowMap.get(date);

      points.push({
        date,
        avgScore: found ? found.avgScore : null,
        recordCount: found ? found.recordCount : 0,
      });
    }

    const metrics = emotionService.calculateTrendMetrics(points);

    return {
      windowDays: TREND_DAYS,
      points,
      metrics,
    };
  }

  async getNostalgia(decade, userId) {
    const decadeKey = normalizeDecade(decade);
    const data = NOSTALGIA_LIBRARY[decadeKey] || NOSTALGIA_LIBRARY['1980s'];

    if (userId) {
      const summary = `为您推荐 ${decadeKey} 的怀旧内容：老歌 ${data.songs.length} 首、老电影 ${data.movies.length} 部、老照片 ${data.photos.length} 组。`;

      await CompanionModel.createChatSession({
        userId,
        message: `怀旧推荐请求：${decadeKey}`,
        reply: summary,
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
