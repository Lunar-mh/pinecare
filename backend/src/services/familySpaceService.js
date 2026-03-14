'use strict';

const path = require('path');
const familySpaceModel = require('../models/familySpace');
const ossService = require('./ossService');
const { createBizError } = require('../utils/serviceError');


function parsePage(page) {
  const value = Number(page);
  if (!Number.isInteger(value) || value <= 0) return 1;
  return value;
}

function parsePageSize(pageSize) {
  const value = Number(pageSize);
  if (!Number.isInteger(value) || value <= 0) return 10;
  return Math.min(value, 100);
}

function normalizeExtByMimeType(mimeType) {
  const map = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };
  return map[mimeType] || '';
}

function buildStorageKey(prefix, userId, file) {
  const extFromName = path.extname((file && file.originalname) || '').toLowerCase();
  const ext = extFromName || normalizeExtByMimeType((file && file.mimetype) || '') || '.dat';
  return `${prefix}/${Date.now()}_${userId}_${Math.floor(Math.random() * 100000)}${ext}`;
}

function mapVoiceMessage(row) {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    audioUrl: row.audio_url,
    durationSeconds: row.duration_seconds,
    isPlayed: Boolean(row.is_played),
    createdAt: row.created_at,
    fromUser: {
      nickname: row.from_user_nickname,
      realName: row.from_user_real_name,
      avatarUrl: row.from_user_avatar_url,
    },
  };
}

function mapAlbumPhoto(row) {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    imageUrl: row.image_url,
    caption: row.caption,
    createdAt: row.created_at,
    user: {
      nickname: row.user_nickname,
      realName: row.user_real_name,
      avatarUrl: row.user_avatar_url,
    },
  };
}

function mapPointDetail(row) {
  return {
    id: row.id,
    userId: row.user_id,
    familyId: row.family_id,
    points: row.points,
    actionType: row.action_type,
    createdAt: row.created_at,
  };
}

const familySpaceService = {
  async sendMessage(userId, payload) {
    const fromUserId = Number(userId);
    const toUserId = Number(payload.toUserId);
    const durationSeconds = Number(payload.durationSeconds);
    const audioFile = payload.audioFile;

    if (!audioFile || !Buffer.isBuffer(audioFile.buffer)) {
      throw createBizError(400, '音频文件为必填项。', 400);
    }
    if (fromUserId === toUserId) {
      throw createBizError(400, '不能给自己发送语音消息。', 400);
    }

    const sharedFamilyId = await familySpaceModel.findSharedFamilyId(fromUserId, toUserId);
    if (!sharedFamilyId) {
      throw createBizError(403, '用户不在同一家庭空间。', 403);
    }

    const audioKey = buildStorageKey('family-space/audio', fromUserId, audioFile);
    const audioUrl = await ossService.uploadAudio(audioFile.buffer, audioKey);
    const row = await familySpaceModel.createVoiceMessage({
      fromUserId,
      toUserId,
      audioUrl,
      durationSeconds,
    });

    return {
      familyId: sharedFamilyId,
      message: mapVoiceMessage(row),
    };
  },

  async listMessages(userId, query) {
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize);
    const result = await familySpaceModel.listReceivedVoiceMessages(Number(userId), page, pageSize);

    return {
      list: result.list.map(mapVoiceMessage),
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize) || 0,
      },
    };
  },

  async uploadAlbum(userId, payload) {
    const parsedUserId = Number(userId);
    const familyId = Number(payload.familyId);
    const imageFile = payload.imageFile;
    const caption = payload.caption || '';

    if (!imageFile || !Buffer.isBuffer(imageFile.buffer)) {
      throw createBizError(400, '图片文件为必填项。', 400);
    }

    const allowed = await familySpaceModel.checkUserInFamily(parsedUserId, familyId);
    if (!allowed) {
      throw createBizError(403, '用户无权访问该家庭空间。', 403);
    }

    const imageKey = buildStorageKey('family-space/album', parsedUserId, imageFile);
    const imageUrl = await ossService.uploadImage(imageFile.buffer, imageKey);
    const photoRow = await familySpaceModel.createAlbumPhoto({
      userId: parsedUserId,
      familyId,
      imageUrl,
      caption,
    });
    const pointRow = await familySpaceModel.addFamilyPoints({
      userId: parsedUserId,
      familyId,
      points: 1,
      actionType: 'album_upload',
    });

    return {
      photo: mapAlbumPhoto(photoRow),
      pointsAwarded: 1,
      pointRecord: mapPointDetail(pointRow),
    };
  },

  async listAlbum(userId, query) {
    const parsedUserId = Number(userId);
    const familyId = Number(query.familyId);
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize);

    const allowed = await familySpaceModel.checkUserInFamily(parsedUserId, familyId);
    if (!allowed) {
      throw createBizError(403, '用户无权访问该家庭空间。', 403);
    }

    const result = await familySpaceModel.listAlbumByFamilyId(familyId, page, pageSize);
    return {
      familyId,
      list: result.list.map(mapAlbumPhoto),
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize) || 0,
      },
    };
  },

  async getPoints(userId, query) {
    const parsedUserId = Number(userId);
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize);
    const totalPoints = await familySpaceModel.getUserPointsTotal(parsedUserId);
    const detailResult = await familySpaceModel.listUserPointsDetails(parsedUserId, page, pageSize);

    return {
      totalPoints,
      details: detailResult.list.map(mapPointDetail),
      pagination: {
        page,
        pageSize,
        total: detailResult.total,
        totalPages: Math.ceil(detailResult.total / pageSize) || 0,
      },
    };
  },

  async getLeaderboard(userId, query) {
    const parsedUserId = Number(userId);
    const familyId = Number(query.familyId);
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize);

    const allowed = await familySpaceModel.checkUserInFamily(parsedUserId, familyId);
    if (!allowed) {
      throw createBizError(403, 'User cannot access this family space.', 403);
    }

    const result = await familySpaceModel.getFamilyLeaderboard(familyId, page, pageSize);
    return {
      familyId,
      list: result.list.map((row, index) => ({
        rank: (page - 1) * pageSize + index + 1,
        userId: row.user_id,
        nickname: row.nickname,
        realName: row.real_name,
        avatarUrl: row.avatar_url,
        totalPoints: Number(row.total_points || 0),
      })),
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize) || 0,
      },
    };
  },
};

module.exports = familySpaceService;
