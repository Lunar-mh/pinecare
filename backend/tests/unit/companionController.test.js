'use strict';

jest.mock('../../src/services/companionService', () => ({
  chat: jest.fn(),
  getGames: jest.fn(),
  recordGame: jest.fn(),
  getEmotionTrend: jest.fn(),
  getNostalgia: jest.fn(),
}));

const companionService = require('../../src/services/companionService');
const controller = require('../../src/controllers/companionController');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

describe('companionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns companion chat output', async () => {
    companionService.chat.mockResolvedValue({ reply: '你好' });
    const res = createRes();

    await controller.chat(
      {
        user: { userId: 3 },
        body: { message: '今天有点无聊' },
      },
      res
    );

    expect(companionService.chat).toHaveBeenCalledWith(3, '今天有点无聊');
    expect(res.body).toEqual({ code: 0, message: 'chat ok', data: { reply: '你好' } });
  });

  it('returns available games', async () => {
    companionService.getGames.mockReturnValue([{ key: 'memory' }]);
    const res = createRes();

    await controller.getGames({}, res);

    expect(res.body).toEqual({ code: 0, message: 'games ok', data: [{ key: 'memory' }] });
  });

  it('maps coded errors for game records', async () => {
    const error = new Error('Game score invalid.');
    error.code = 422;
    error.statusCode = 422;
    error.data = { field: 'score' };
    companionService.recordGame.mockRejectedValue(error);
    const res = createRes();

    await controller.recordGame(
      {
        user: { userId: 3 },
        body: { gameKey: 'memory', score: -1 },
      },
      res
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({ code: 422, message: 'Game score invalid.', data: { field: 'score' } });
  });

  it('uses generic 500 for uncoded emotion errors', async () => {
    companionService.getEmotionTrend.mockRejectedValue(new Error('Emotion trend unavailable.'));
    const res = createRes();

    await controller.getEmotion(
      {
        user: { userId: 3 },
      },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ code: 500, message: 'Emotion trend unavailable.', data: null });
  });

  it('passes null user to nostalgia when no auth user is present', async () => {
    companionService.getNostalgia.mockResolvedValue({ decade: '1980s' });
    const res = createRes();

    await controller.getNostalgia(
      {
        query: { decade: '1980s' },
      },
      res
    );

    expect(companionService.getNostalgia).toHaveBeenCalledWith('1980s', null);
    expect(res.body.code).toBe(0);
  });
});
