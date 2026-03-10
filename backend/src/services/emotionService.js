'use strict';

const POSITIVE_WORDS = [
  '开心',
  '高兴',
  '幸福',
  '满足',
  '安心',
  '放松',
  '喜欢',
  '感恩',
  '期待',
  '顺利',
  '有趣',
  '温暖',
  '希望',
  '精神',
  '舒服',
];

const NEGATIVE_WORDS = [
  '难过',
  '孤独',
  '害怕',
  '焦虑',
  '失眠',
  '痛苦',
  '烦躁',
  '生气',
  '绝望',
  '疲惫',
  '无助',
  '压抑',
  '担心',
  '伤心',
  '低落',
];

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function normalizeScore(rawScore) {
  const numeric = Number(rawScore);
  if (Number.isNaN(numeric)) {
    return 50;
  }
  return Math.round(clamp(numeric, 0, 100));
}

function scoreTextEmotion(text) {
  const content = String(text || '').trim();
  if (!content) {
    return 0;
  }

  let score = 0;

  for (const word of POSITIVE_WORDS) {
    if (content.includes(word)) {
      score += 1;
    }
  }

  for (const word of NEGATIVE_WORDS) {
    if (content.includes(word)) {
      score -= 1;
    }
  }

  return score;
}

function analyzeDialogEmotion(message, reply) {
  const userDelta = scoreTextEmotion(message);
  const replyDelta = scoreTextEmotion(reply);

  // 用户表达权重更高，回复语气用于微调
  const weightedDelta = userDelta * 2 + replyDelta;
  const raw = 50 + weightedDelta * 6;
  return normalizeScore(raw);
}

function calculateTrendMetrics(points) {
  const valid = (points || []).filter((item) => Number.isFinite(Number(item.avgScore)));

  if (valid.length === 0) {
    return {
      meanScore: 0,
      volatility: 0,
      trend: '平稳',
      totalDays: 0,
    };
  }

  const values = valid.map((item) => Number(item.avgScore));
  const sum = values.reduce((acc, cur) => acc + cur, 0);
  const mean = sum / values.length;

  let fluctuationSum = 0;
  for (let i = 1; i < values.length; i += 1) {
    fluctuationSum += Math.abs(values[i] - values[i - 1]);
  }
  const volatility = values.length > 1 ? fluctuationSum / (values.length - 1) : 0;

  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half || 1);
  const secondHalf = values.slice(half || 1);
  const firstAvg = firstHalf.reduce((acc, cur) => acc + cur, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((acc, cur) => acc + cur, 0) / secondHalf.length
      : firstAvg;

  let trend = '平稳';
  if (secondAvg - firstAvg >= 5) {
    trend = '上升';
  } else if (firstAvg - secondAvg >= 5) {
    trend = '下降';
  }

  return {
    meanScore: Number(mean.toFixed(2)),
    volatility: Number(volatility.toFixed(2)),
    trend,
    totalDays: valid.length,
  };
}

module.exports = {
  normalizeScore,
  scoreTextEmotion,
  analyzeDialogEmotion,
  calculateTrendMetrics,
};
