'use strict';

jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('../../src/models/companion', () => ({
  createChatSession: jest.fn(),
  upsertEmotionTrackByDate: jest.fn(),
  createGameRecord: jest.fn(),
  listGameRecordsByUser: jest.fn(),
  getEmotionTracksByDays: jest.fn(),
}));

jest.mock('../../src/models/auditLog', () => ({
  create: jest.fn(),
}));

jest.mock('../../src/services/qwenService', () => ({
  chatWithQwen: jest.fn(),
}));

jest.mock('../../src/services/contentSafetyService', () => ({
  check: jest.fn(),
}));

const redis = require('../../src/config/redis');
const CompanionModel = require('../../src/models/companion');
const AuditLogModel = require('../../src/models/auditLog');
const qwenService = require('../../src/services/qwenService');
const contentSafetyService = require('../../src/services/contentSafetyService');
const companionService = require('../../src/services/companionService');

describe('companionService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
      DASHSCOPE_API_KEY: 'test-key',
      AI_COMPANION_MODE: 'auto',
      DASHSCOPE_MODE: 'auto',
    };

    redis.get.mockResolvedValue('[]');
    redis.set.mockResolvedValue('OK');
    CompanionModel.createChatSession.mockResolvedValue(1);
    CompanionModel.upsertEmotionTrackByDate.mockResolvedValue(undefined);
    contentSafetyService.check.mockResolvedValue({
      safe: true,
      riskType: 'none',
      riskLevel: 'low',
      matchedKeyword: null,
      triage: {
        allowResponse: true,
        needsManualFollowup: false,
        responseSuffix: '',
      },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns live companion output with safety and diagnostics', async () => {
    qwenService.chatWithQwen.mockResolvedValue({
      reply: 'Hello, I am here with you.',
      model: 'qwen-turbo',
      tokens: 42,
    });

    const result = await companionService.chat(1001, 'How are you today?');

    expect(qwenService.chatWithQwen).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'How are you today?' }),
      ]),
      1001
    );
    expect(CompanionModel.createChatSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1001, message: 'How are you today?' })
    );
    expect(result).toMatchObject({
      reply: 'Hello, I am here with you.',
      model: 'qwen-turbo',
      tokens: 42,
      safety: {
        safe: true,
        riskType: 'none',
        riskLevel: 'low',
      },
      diagnostics: {
        mode: 'live',
        source: 'dashscope_live',
        fallbackUsed: false,
      },
    });
  });

  it('blocks unsafe content and returns manual follow-up metadata', async () => {
    contentSafetyService.check.mockResolvedValueOnce({
      safe: false,
      riskType: 'self_harm',
      riskLevel: 'high',
      matchedKeyword: 'suicide',
      triage: {
        allowResponse: false,
        needsManualFollowup: true,
        responseSuffix: '',
      },
    });

    await expect(companionService.chat(1002, 'I want to hurt myself')).rejects.toMatchObject({
      code: 403,
      statusCode: 403,
      message: 'Message requires manual follow-up.',
      data: {
        safety: expect.objectContaining({ riskType: 'self_harm', riskLevel: 'high' }),
        manualFollowupSuggested: true,
      },
    });

    expect(qwenService.chatWithQwen).not.toHaveBeenCalled();
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'companion.chat.blocked',
        details: expect.objectContaining({ matchedKeyword: 'suicide' }),
      })
    );
  });

  it('falls back to stub output and audits when live call fails in sandbox', async () => {
    qwenService.chatWithQwen.mockRejectedValueOnce(new Error('dashscope timeout'));

    const result = await companionService.chat(1003, 'Please keep me company');

    expect(result.reply).toContain('I am here with you.');
    expect(result.diagnostics).toEqual({
      mode: 'stub',
      source: 'companion_stub',
      fallbackUsed: true,
    });
    expect(AuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'companion.chat.fallback',
        details: expect.objectContaining({ fallbackReason: 'dashscope timeout' }),
      })
    );
  });

  it('uses stub mode directly when configured away from live', async () => {
    process.env.AI_COMPANION_MODE = 'stub';

    const result = await companionService.chat(1004, 'Tell me a simple story');

    expect(qwenService.chatWithQwen).not.toHaveBeenCalled();
    expect(result.diagnostics).toEqual({
      mode: 'stub',
      source: 'companion_stub',
      fallbackUsed: false,
    });
  });
});
