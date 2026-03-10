'use strict';

const { fail } = require('../utils/response');

const VALID_GAME_TYPES = ['memory', 'word_chain', 'puzzle'];

function validateChat(req, res, next) {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

  if (!message) {
    return fail(res, 422, 'message 不能为空', null, 422);
  }

  if (message.length > 500) {
    return fail(res, 422, 'message 长度不能超过 500 个字符', null, 422);
  }

  req.body.message = message;
  return next();
}

function validateGameRecord(req, res, next) {
  const body = req.body || {};
  const gameType = typeof body.gameType === 'string' ? body.gameType.trim() : '';
  const score = Number(body.score);
  const difficulty = Number(body.difficulty);
  const durationSeconds = Number(body.durationSeconds);

  if (!VALID_GAME_TYPES.includes(gameType)) {
    return fail(
      res,
      422,
      `gameType 仅支持: ${VALID_GAME_TYPES.join(', ')}`,
      null,
      422
    );
  }

  if (!Number.isFinite(score) || score < 0) {
    return fail(res, 422, 'score 必须为大于等于 0 的数字', null, 422);
  }

  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    return fail(res, 422, 'difficulty 必须为 1-5 的整数', null, 422);
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return fail(res, 422, 'durationSeconds 必须为大于等于 0 的数字', null, 422);
  }

  req.body.gameType = gameType;
  req.body.score = score;
  req.body.difficulty = difficulty;
  req.body.durationSeconds = durationSeconds;
  return next();
}

function validateNostalgia(req, res, next) {
  const decade = req.query && req.query.decade ? String(req.query.decade).trim() : '';

  if (!decade) {
    return next();
  }

  const supported =
    /^19(50|60|70|80|90)s$/.test(decade) ||
    /^(50|60|70|80|90)年代$/.test(decade) ||
    /^(1950|1960|1970|1980|1990)$/.test(decade) ||
    /^(50|60|70|80|90)s$/.test(decade);

  if (!supported) {
    return fail(
      res,
      422,
      'decade 格式不正确，仅支持 1950s-1990s、50年代-90年代、1950-1990',
      null,
      422
    );
  }

  return next();
}

module.exports = {
  validateChat,
  validateGameRecord,
  validateNostalgia,
};
