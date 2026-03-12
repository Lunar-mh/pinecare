'use strict';

const fs = require('fs');
const path = require('path');

jest.mock('../../src/models/voice', () => ({
  createSession: jest.fn(),
  getSessionById: jest.fn(),
  getSessionByIdAndUser: jest.fn(),
  incrementRoundCount: jest.fn(),
  createCommandLog: jest.fn(),
  getSessionsByUser: jest.fn(),
  countSessionsByUser: jest.fn(),
  getLogsBySession: jest.fn(),
  countLogsBySession: jest.fn(),
}));
jest.mock('../../src/services/asrService', () => ({ recognize: jest.fn() }));
jest.mock('../../src/services/ttsService', () => ({ synthesize: jest.fn() }));

const VoiceModel = require('../../src/models/voice');
const asrService = require('../../src/services/asrService');
const ttsService = require('../../src/services/ttsService');
const service = require('../../src/services/voiceInteractionService');

const voiceServiceSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/services/voiceInteractionService.js'),
  'utf8'
);
const WAKE_WORD = voiceServiceSource.match(/const WAKE_WORD = '([^']+)'/)[1];

describe('voiceInteractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    VoiceModel.createSession.mockResolvedValue(101);
    VoiceModel.getSessionById.mockResolvedValue({ id: 101, round_count: 1 });
    VoiceModel.getSessionByIdAndUser.mockResolvedValue({ id: 101, user_id: 7, round_count: 1 });
    VoiceModel.getSessionsByUser.mockResolvedValue([{ id: 101 }]);
    VoiceModel.countSessionsByUser.mockResolvedValue(1);
    VoiceModel.getLogsBySession.mockResolvedValue([{ id: 1 }]);
    VoiceModel.countLogsBySession.mockResolvedValue(1);
  });

  it('recognizes wake-word flow and logs failed attempts', async () => {
    asrService.recognize.mockResolvedValueOnce('hello world');
    await expect(service.recognize(7, { audioData: 'audio' })).rejects.toMatchObject({ code: 422 });
    expect(VoiceModel.createCommandLog).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));

    asrService.recognize.mockResolvedValueOnce(`${WAKE_WORD} help`);
    await expect(service.recognize(7, { audioData: 'audio', sessionId: 101 })).resolves.toMatchObject({
      sessionId: 101,
      recognizedText: `${WAKE_WORD} help`,
      wakeWord: WAKE_WORD,
    });
  });

  it('synthesizes audio, paginates sessions, and validates log access', async () => {
    ttsService.synthesize.mockResolvedValueOnce('base64-audio');
    await expect(service.synthesize(7, { text: 'hello', sessionId: 101 })).resolves.toMatchObject({
      sessionId: 101,
      audioData: 'base64-audio',
    });

    await expect(service.getSessions(7, { page: '2', pageSize: '100' })).resolves.toMatchObject({
      pagination: { page: 2, pageSize: 50, total: 1 },
    });

    await expect(service.getSessionLogs(7, '101', { page: '1', pageSize: '2' })).resolves.toMatchObject({
      session: { id: 101 },
      pagination: { page: 1, pageSize: 2, total: 1 },
    });

    await expect(service.getSessionLogs(7, 'bad', {})).rejects.toMatchObject({ code: 400 });
  });
});
