'use strict';

const familySpaceService = require('../services/familySpaceService');
const { ok, fail } = require('../utils/response');

function handleBusinessError(error, res, next) {
  if (error && error.statusCode) {
    return fail(
      res,
      error.code || error.statusCode,
      error.message || '请求失败',
      error.data || null,
      error.statusCode
    );
  }

  return next(error);
}

async function sendMessage(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, 400, '请上传音频文件', null, 400);
    }

    const data = await familySpaceService.sendMessage(req.user.userId, {
      toUserId: req.body.to_user_id,
      durationSeconds: req.body.duration_seconds,
      audioFile: req.file,
    });

    return ok(res, data, '语音留言发送成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function listMessages(req, res, next) {
  try {
    const data = await familySpaceService.listMessages(req.user.userId, {
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    return ok(res, data, '语音留言列表获取成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function uploadAlbum(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, 400, '请上传图片文件', null, 400);
    }

    const data = await familySpaceService.uploadAlbum(req.user.userId, {
      familyId: req.body.family_id,
      caption: req.body.caption,
      imageFile: req.file,
    });

    return ok(res, data, '家庭相册上传成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function listAlbum(req, res, next) {
  try {
    const data = await familySpaceService.listAlbum(req.user.userId, {
      familyId: req.query.family_id,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    return ok(res, data, '家庭相册列表获取成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function getPoints(req, res, next) {
  try {
    const data = await familySpaceService.getPoints(req.user.userId, {
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    return ok(res, data, '孝心值查询成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const data = await familySpaceService.getLeaderboard(req.user.userId, {
      familyId: req.query.family_id,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    return ok(res, data, '家庭孝心值排行榜查询成功');
  } catch (error) {
    return handleBusinessError(error, res, next);
  }
}

module.exports = {
  sendMessage,
  listMessages,
  uploadAlbum,
  listAlbum,
  getPoints,
  getLeaderboard,
};
