'use strict';

const voiceInteractionService = require('../services/voiceInteractionService');
const { ok, fail } = require('../utils/response');

function mapError(res, err) {
  const code =
    typeof err.code === 'number'
      ? err.code
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : code;
  const message = err.message || '语音服务处理失败';
  return fail(res, code, message, null, status);
}

async function recognize(req, res) {
  try {
    const userId = req.user.userId;
    const data = await voiceInteractionService.recognize(userId, {
      audioData: req.body.audioData,
      sessionId: req.body.sessionId,
    });
    return ok(res, data, '语音识别成功');
  } catch (err) {
    return mapError(res, err);
  }
}

async function synthesize(req, res) {
  try {
    const userId = req.user.userId;
    const data = await voiceInteractionService.synthesize(userId, {
      text: req.body.text,
      sessionId: req.body.sessionId,
    });
    return ok(res, data, '语音合成成功');
  } catch (err) {
    return mapError(res, err);
  }
}

async function getSessions(req, res) {
  try {
    const userId = req.user.userId;
    const data = await voiceInteractionService.getSessions(userId, {
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    return ok(res, data, '语音会话查询成功');
  } catch (err) {
    return mapError(res, err);
  }
}

async function getSessionLogs(req, res) {
  try {
    const userId = req.user.userId;
    const data = await voiceInteractionService.getSessionLogs(userId, req.params.sessionId, {
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    return ok(res, data, '语音日志查询成功');
  } catch (err) {
    return mapError(res, err);
  }
}

module.exports = {
  recognize,
  synthesize,
  getSessions,
  getSessionLogs,
};
