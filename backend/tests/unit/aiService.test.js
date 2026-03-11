'use strict';

jest.mock('../../src/models/consultRecord', () => ({
  findBySession: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../src/services/healthContextService', () => ({
  getContextForUser: jest.fn(),
}));

jest.mock('../../src/utils/promptTemplate', () => ({
  buildSystemPrompt: jest.fn().mockReturnValue('system prompt'),
}));

describe('aiService', () => {
  let originalEnv;
  let axios;
  let aiService;
  let ConsultRecord;
  let healthContextService;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    axios = require('axios');
    ConsultRecord = require('../../src/models/consultRecord');
    healthContextService = require('../../src/services/healthContextService');

    healthContextService.getContextForUser.mockResolvedValue({
      profile: { real_name: '张阿姨', chronicDiseases: ['高血压'] },
      contextMessages: [{ role: 'system', content: 'context' }],
    });
    ConsultRecord.findBySession.mockResolvedValue([]);
    ConsultRecord.create.mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  function loadService(env = {}) {
    process.env = { ...originalEnv, ...env };
    aiService = require('../../src/services/aiService');
    return aiService;
  }

  it('returns stub reply in sandbox when mode is stub', async () => {
    const service = loadService({
      AI_CONSULT_MODE: 'stub',
      COMPETITION_SANDBOX: '1',
      PRODUCTION_LIVE: '0',
    });

    const result = await service.chat(1001, '最近头晕怎么办', 'session-1');

    expect(result.sessionId).toBe('session-1');
    expect(result.reply).toContain('张阿姨');
    expect(result.tokens).toBeNull();
    expect(ConsultRecord.create).toHaveBeenCalledTimes(2);
  });

  it('throws 503 in production live when api key is missing', async () => {
    const service = loadService({
      AI_CONSULT_MODE: 'live',
      DASHSCOPE_API_KEY: '',
      PRODUCTION_LIVE: '1',
      COMPETITION_SANDBOX: '0',
    });

    await expect(service.chat(1001, 'test', 'session-2')).rejects.toMatchObject({
      code: 503,
      statusCode: 503,
    });
  });

  it('retries on 5xx and returns live reply', async () => {
    axios.post = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce({
        data: {
          output: {
            choices: [{ message: { content: '建议今天继续观察血压变化。' } }],
          },
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
        },
      });

    const service = loadService({
      AI_CONSULT_MODE: 'live',
      DASHSCOPE_API_KEY: 'test-key',
      PRODUCTION_LIVE: '0',
      COMPETITION_SANDBOX: '1',
      AI_CONSULT_MAX_RETRY: '1',
    });

    const result = await service.chat(1001, '最近血压有点高', 'session-3');

    expect(result.reply).toBe('建议今天继续观察血压变化。');
    expect(result.tokens).toBe(15);
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('maps timeout to 504 in live mode', async () => {
    axios.post = jest.fn().mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });

    const service = loadService({
      AI_CONSULT_MODE: 'live',
      DASHSCOPE_API_KEY: 'test-key',
      AI_CONSULT_MAX_RETRY: '0',
    });

    await expect(service.chat(1001, 'test', 'session-4')).rejects.toMatchObject({
      code: 504,
      statusCode: 504,
    });
  });
});
