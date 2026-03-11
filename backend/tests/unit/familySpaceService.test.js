'use strict';

jest.mock('../../src/models/familySpace', () => ({
  findSharedFamilyId: jest.fn(),
  createVoiceMessage: jest.fn(),
  listReceivedVoiceMessages: jest.fn(),
  checkUserInFamily: jest.fn(),
  createAlbumPhoto: jest.fn(),
  addFamilyPoints: jest.fn(),
  listAlbumByFamilyId: jest.fn(),
  getUserPointsTotal: jest.fn(),
  listUserPointsDetails: jest.fn(),
  getFamilyLeaderboard: jest.fn(),
}));

jest.mock('../../src/services/ossService', () => ({
  uploadAudio: jest.fn(),
  uploadImage: jest.fn(),
}));

const familySpaceModel = require('../../src/models/familySpace');
const ossService = require('../../src/services/ossService');
const familySpaceService = require('../../src/services/familySpaceService');

describe('familySpaceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid audio uploads', async () => {
    await expect(
      familySpaceService.sendMessage(1, {
        toUserId: 2,
        durationSeconds: 8,
        audioFile: null,
      })
    ).rejects.toMatchObject({ code: 400 });
  });

  it('rejects sending message to self', async () => {
    await expect(
      familySpaceService.sendMessage(1, {
        toUserId: 1,
        durationSeconds: 8,
        audioFile: { buffer: Buffer.from('abc'), originalname: 'voice.mp3', mimetype: 'audio/mp3' },
      })
    ).rejects.toMatchObject({ code: 400 });
  });

  it('rejects cross-family voice messages', async () => {
    familySpaceModel.findSharedFamilyId.mockResolvedValue(null);

    await expect(
      familySpaceService.sendMessage(1, {
        toUserId: 2,
        durationSeconds: 8,
        audioFile: { buffer: Buffer.from('abc'), originalname: 'voice.mp3', mimetype: 'audio/mp3' },
      })
    ).rejects.toMatchObject({ code: 403 });
  });

  it('uploads voice message and maps response', async () => {
    familySpaceModel.findSharedFamilyId.mockResolvedValue(11);
    ossService.uploadAudio.mockResolvedValue('https://oss/audio.mp3');
    familySpaceModel.createVoiceMessage.mockResolvedValue({
      id: 9,
      from_user_id: 1,
      to_user_id: 2,
      audio_url: 'https://oss/audio.mp3',
      duration_seconds: 8,
      is_played: 0,
      created_at: '2026-03-11 10:00:00',
      from_user_nickname: 'Elder',
      from_user_real_name: 'Zhang',
      from_user_avatar_url: null,
    });

    const result = await familySpaceService.sendMessage(1, {
      toUserId: 2,
      durationSeconds: 8,
      audioFile: { buffer: Buffer.from('abc'), originalname: 'voice.mp3', mimetype: 'audio/mp3' },
    });

    expect(ossService.uploadAudio).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('family-space/audio/')
    );
    expect(result.familyId).toBe(11);
    expect(result.message.fromUserId).toBe(1);
    expect(result.message.audioUrl).toBe('https://oss/audio.mp3');
  });

  it('uploads album only for family members and grants points', async () => {
    familySpaceModel.checkUserInFamily.mockResolvedValue(true);
    ossService.uploadImage.mockResolvedValue('https://oss/photo.jpg');
    familySpaceModel.createAlbumPhoto.mockResolvedValue({
      id: 3,
      user_id: 1,
      family_id: 7,
      image_url: 'https://oss/photo.jpg',
      caption: 'pic',
      created_at: '2026-03-11 10:00:00',
      user_nickname: 'Alice',
      user_real_name: 'Alice',
      user_avatar_url: null,
    });
    familySpaceModel.addFamilyPoints.mockResolvedValue({
      id: 8,
      user_id: 1,
      family_id: 7,
      points: 1,
      action_type: 'album_upload',
      created_at: '2026-03-11 10:00:00',
    });

    const result = await familySpaceService.uploadAlbum(1, {
      familyId: 7,
      caption: 'pic',
      imageFile: { buffer: Buffer.from('img'), originalname: 'photo.jpg', mimetype: 'image/jpeg' },
    });

    expect(ossService.uploadImage).toHaveBeenCalled();
    expect(result.pointsAwarded).toBe(1);
    expect(result.photo.familyId).toBe(7);
  });

  it('rejects album listing for unauthorized user', async () => {
    familySpaceModel.checkUserInFamily.mockResolvedValue(false);

    await expect(
      familySpaceService.listAlbum(1, {
        familyId: 7,
        page: 1,
        pageSize: 10,
      })
    ).rejects.toMatchObject({ code: 403 });
  });

  it('returns user points with normalized pagination', async () => {
    familySpaceModel.getUserPointsTotal.mockResolvedValue(5);
    familySpaceModel.listUserPointsDetails.mockResolvedValue({
      total: 1,
      list: [
        {
          id: 1,
          user_id: 1,
          family_id: 7,
          points: 1,
          action_type: 'album_upload',
          created_at: '2026-03-11 10:00:00',
        },
      ],
    });

    const result = await familySpaceService.getPoints(1, {
      page: '0',
      pageSize: '999',
    });

    expect(result.totalPoints).toBe(5);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns leaderboard with computed ranks', async () => {
    familySpaceModel.checkUserInFamily.mockResolvedValue(true);
    familySpaceModel.getFamilyLeaderboard.mockResolvedValue({
      total: 2,
      list: [
        {
          user_id: 2,
          nickname: 'Bob',
          real_name: 'Bob',
          avatar_url: null,
          total_points: 9,
        },
        {
          user_id: 3,
          nickname: 'Carol',
          real_name: 'Carol',
          avatar_url: null,
          total_points: 7,
        },
      ],
    });

    const result = await familySpaceService.getLeaderboard(1, {
      familyId: 7,
      page: 2,
      pageSize: 2,
    });

    expect(result.list[0].rank).toBe(3);
    expect(result.list[0].totalPoints).toBe(9);
    expect(result.pagination.totalPages).toBe(1);
  });
});
