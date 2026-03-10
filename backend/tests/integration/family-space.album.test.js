'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 8001 };
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

describe('家庭空间相册接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /family-space/album/upload 上传成功并增加孝心值', async () => {
    familySpaceService.uploadAlbum.mockResolvedValue({
      photo: {
        id: 201,
        familyId: 9001,
        imageUrl: 'https://oss.example.com/family-space/family-space/album/mock.jpg',
      },
      pointsAwarded: 1,
      pointRecord: {
        id: 501,
        points: 1,
        actionType: 'album_upload',
      },
    });

    const app = createApp();
    const res = await request(app)
      .post('/family-space/album/upload')
      .field('family_id', '9001')
      .field('caption', '周末聚会')
      .attach('image', Buffer.from('mock-image-data'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('家庭相册上传成功');
    expect(res.body.data.pointsAwarded).toBe(1);
    expect(familySpaceService.uploadAlbum).toHaveBeenCalledWith(
      8001,
      expect.objectContaining({
        familyId: 9001,
        caption: '周末聚会',
        imageFile: expect.objectContaining({
          mimetype: 'image/jpeg',
        }),
      })
    );
  });

  test('POST /family-space/album/upload 跨家庭访问返回 403', async () => {
    familySpaceService.uploadAlbum.mockRejectedValue({
      code: 403,
      statusCode: 403,
      message: '无权访问该家庭空间',
    });

    const app = createApp();
    const res = await request(app)
      .post('/family-space/album/upload')
      .field('family_id', '9999')
      .field('caption', '不应成功')
      .attach('image', Buffer.from('mock-image-data'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('无权访问该家庭空间');
  });

  test('GET /family-space/album/list 支持家庭内列表查询', async () => {
    familySpaceService.listAlbum.mockResolvedValue({
      familyId: 9001,
      list: [
        { id: 5, caption: '新照片' },
        { id: 4, caption: '旧照片' },
      ],
      pagination: {
        page: 1,
        pageSize: 2,
        total: 2,
        totalPages: 1,
      },
    });

    const app = createApp();
    const res = await request(app).get('/family-space/album/list?family_id=9001&page=1&pageSize=2');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list.length).toBe(2);
    expect(familySpaceService.listAlbum).toHaveBeenCalledWith(8001, {
      familyId: '9001',
      page: '1',
      pageSize: '2',
    });
  });
});
