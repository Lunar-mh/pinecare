'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        data: null,
      });
    }

    req.user = { userId: 9011 };
    return next();
  };
});

jest.mock('../../src/middleware/companionRateLimiter', () => ({
  companionChatRateLimiter: (req, res, next) => next(),
}));

jest.mock('../../src/services/companionService', () => ({
  chat: jest.fn().mockResolvedValue({
    reply: '听到您这么说，我很开心，我们可以继续聊聊。',
    emotionScore: 82,
    model: 'qwen-turbo',
    tokens: 123,
    contextCount: 6,
  }),
  getGames: jest.fn().mockReturnValue([
    {
      gameType: 'memory',
      name: '数字记忆',
      description: '短时记忆训练',
      rules: '按顺序输入数字',
      difficulties: [1, 2, 3, 4, 5],
    },
  ]),
  recordGame: jest.fn().mockResolvedValue({
    recordId: 1001,
    gameType: 'memory',
    score: 88,
    difficulty: 3,
    durationSeconds: 120,
    bestScore: 95,
  }),
  getEmotionTrend: jest.fn().mockResolvedValue({
    windowDays: 30,
    points: [{ date: '2026-02-20', avgScore: 76, recordCount: 2 }],
    metrics: { meanScore: 76, volatility: 0, trend: '平稳', totalDays: 1 },
  }),
  getNostalgia: jest.fn().mockResolvedValue({
    decade: '1980s',
    songs: [{ title: '甜蜜蜜', artist: '邓丽君' }],
    movies: [{ title: '牧马人', year: 1982 }],
    photos: [{ title: '大头电视机', description: '童年回忆' }],
  }),
}));

const router = require('../../src/routes/aiCompanion');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/ai-companion', router);
  return app;
}

function expectContractShape(body) {
  expect(body).toHaveProperty('code');
  expect(body).toHaveProperty('message');
  expect(body).toHaveProperty('data');
}

describe('AI陪伴 API 契约测试', () => {
  it('POST /ai-companion/companion/chat 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/ai-companion/companion/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: '今天心情不错，想和你聊聊。' });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /ai-companion/companion/games 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app).get('/ai-companion/companion/games');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('POST /ai-companion/companion/game/record 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/ai-companion/companion/game/record')
      .set('Authorization', 'Bearer valid-token')
      .send({ gameType: 'memory', score: 88, difficulty: 3, durationSeconds: 120 });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /ai-companion/companion/emotion 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/ai-companion/companion/emotion')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /ai-companion/companion/nostalgia 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/ai-companion/companion/nostalgia')
      .query({ decade: '1980s' });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('缺少鉴权头时，POST /chat 返回 401', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/ai-companion/companion/chat')
      .send({ message: '你好' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: 401,
      message: '未提供认证令牌',
      data: null,
    });
  });

  it('nostalgia decade 非法时返回 422', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/ai-companion/companion/nostalgia')
      .query({ decade: '2000s' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe(422);
    expect(res.body.message).toContain('decade');
  });
});
