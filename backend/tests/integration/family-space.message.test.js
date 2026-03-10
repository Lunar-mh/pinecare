'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 7001 };
    next();
  };
});

jest.mock('../../src/services/familySpaceService', () => ({
  sendMessage: jest.fn(),
  listMessages: jest.fn(),
  uploadAlbum: jest.fn(),
  listAlbum: jest.fn(),
  getPoints: jest.fn(),
  getLeaderboard: jest.fn(),
}));

const familySpaceService = require('../../src/services/familySpaceService');
const familySpaceRouter = require('../../src/routes/familySpace');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/family-space', familySpaceRouter);
  return app;
}

describe('家庭空间语音留言接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /family-space/message/send 发送成功', async () => {
    familySpaceService.sendMessage.mockResolvedValue({
      familyId: 9001,
      message: {
        id: 101,
        fromUserId: 7001,
        toUserId: 7002,
        audioUrl: 'https://oss.example.com/family-space/family-space/audio/mock.mp3',
        durationSeconds: 8,
        isPlayed: false,
      },
    });

    const app = createApp();
    const res = await request(app)
      .post('/family-space/message/send')
      .field('to_user_id', '7002')
      .field('duration_seconds', '8')
      .attach('audio', Buffer.from('mock-audio-data'), {
        filename: 'voice.mp3',
        contentType: 'audio/mpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('语音留言发送成功');
    expect(familySpaceService.sendMessage).toHaveBeenCalledWith(
      7001,
      expect.objectContaining({
        toUserId: 7002,
        durationSeconds: 8,
        audioFile: expect.objectContaining({
          mimetype: 'audio/mpeg',
        }),
      })
    );
  });

  test('POST /family-space/message/send 音频格式错误时返回 400', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/family-space/message/send')
      .field('to_user_id', '7002')
      .field('duration_seconds', '8')
      .attach('audio', Buffer.from('not-audio'), {
        filename: 'voice.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toContain('音频文件格式不支持');
    expect(familySpaceService.sendMessage).not.toHaveBeenCalled();
  });

  test('GET /family-space/message/list 返回按时间倒序列表', async () => {
    familySpaceService.listMessages.mockResolvedValue({
      list: [
        { id: 3, createdAt: '2026-02-21 10:00:00' },
        { id: 2, createdAt: '2026-02-21 09:00:00' },
      ],
      pagination: {
        page: 1,
        pageSize: 2,
        total: 2,
        totalPages: 1,
      },
    });

    const app = createApp();
    const res = await request(app).get('/family-space/message/list?page=1&pageSize=2');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('语音留言列表获取成功');
    expect(res.body.data.list[0].id).toBe(3);
    expect(res.body.data.list[1].id).toBe(2);
    expect(familySpaceService.listMessages).toHaveBeenCalledWith(7001, {
      page: '1',
      pageSize: '2',
    });
  });
});
