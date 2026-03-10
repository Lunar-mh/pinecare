'use strict';

const companionService = require('../services/companionService');
const { ok, fail } = require('../utils/response');

function mapError(res, err) {
  const code =
    typeof err.code === 'number'
      ? err.code
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : code;
  const message = err.message || 'AI陪伴服务处理失败';
  return fail(res, code, message, null, status);
}

async function chat(req, res) {
  try {
    const userId = req.user.userId;
    const data = await companionService.chat(userId, req.body.message);
    return ok(res, data, '对话成功');
  } catch (err) {
    return mapError(res, err);
  }
}

async function getGames(req, res) {
  try {
    const data = companionService.getGames();
    return ok(res, data, '游戏列表获取成功');
  } catch (err) {
    return mapError(res, err);
  }
}

async function recordGame(req, res) {
  try {
    const userId = req.user.userId;
    const data = await companionService.recordGame(userId, req.body || {});
    return ok(res, data, '游戏成绩记录成功');
  } catch (err) {
    return mapError(res, err);
  }
}

async function getEmotion(req, res) {
  try {
    const userId = req.user.userId;
    const data = await companionService.getEmotionTrend(userId);
    return ok(res, data, '情绪趋势获取成功');
  } catch (err) {
    return mapError(res, err);
  }
}

async function getNostalgia(req, res) {
  try {
    const userId = req.user ? req.user.userId : null;
    const data = await companionService.getNostalgia(req.query.decade, userId);
    return ok(res, data, '怀旧内容获取成功');
  } catch (err) {
    return mapError(res, err);
  }
}

module.exports = {
  chat,
  getGames,
  recordGame,
  getEmotion,
  getNostalgia,
};
