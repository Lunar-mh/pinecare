'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, res, next) => {
  req.user = { userId: 5005 };
  next();
});

jest.mock('../../src/services/voiceInteractionService', () => ({
  recognize: jest.fn(),
  synthesize: jest.fn(),
  getSessions: jest.fn(),
  getSessionLogs: jest.fn(),
}));

const voiceService = require('../../src/services/voiceInteractionService');
const voiceRouter = require('../../src/routes/voice');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/voice', voiceRouter);
  return app;
}

describe('语音模块端到端流程测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('recognize -> synthesize -> sessions -> logs 全流程成功', async () => {
    voiceService.recognize.mockResolvedValue({
      sessionId: 701,
      recognizedText: '银伴银伴 今天有几条提醒',
      wakeWord: '银伴银伴',
      roundCount: 1,
    });

    voiceService.synthesize.mockResolvedValue({
      sessionId: 701,
      text: '今天共有2条提醒，需要按时服药。',
      audioData: 'QVVESU9fQkFTRTY0',
      audioFormat: 'mp3',
      roundCount: 2,
    });

    voiceService.getSessions.mockResolvedValue({
      list: [{ id: 701, user_id: 5005, round_count: 2 }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    voiceService.getSessionLogs.mockResolvedValue({
      session: { id: 701, user_id: 5005, round_count: 2 },
      list: [
        { id: 1, command_type: 'recognize', status: 'success' },
        { id: 2, command_type: 'synthesize', status: 'success' },
      ],
      pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    });

    const app = createApp();

    const recognizeRes = await request(app).post('/voice/recognize').send({ audio: 'UklGRnRlc3Q=' });
    expect(recognizeRes.status).toBe(200);
    expect(recognizeRes.body.data.sessionId).toBe(701);

    const synthesizeRes = await request(app).post('/voice/synthesize').send({
      sessionId: 701,
      text: '今天共有2条提醒，需要按时服药。',
    });
    expect(synthesizeRes.status).toBe(200);
    expect(synthesizeRes.body.data.audioFormat).toBe('mp3');

    const sessionsRes = await request(app).get('/voice/sessions').query({ page: 1, pageSize: 10 });
    expect(sessionsRes.status).toBe(200);
    expect(sessionsRes.body.data.list[0].id).toBe(701);

    const logsRes = await request(app).get('/voice/sessions/701/logs').query({ page: 1, pageSize: 10 });
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data.list).toHaveLength(2);
  });
});
