'use strict';

jest.mock('../../src/services/voiceInteractionService', () => ({
  recognize: jest.fn(),
  synthesize: jest.fn(),
  getSessions: jest.fn(),
  getSessionLogs: jest.fn(),
}));

const voiceService = require('../../src/services/voiceInteractionService');
const controller = require('../../src/controllers/voiceController');

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

describe('voiceController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps statusCode-only voice errors through fail envelope', async () => {
    voiceService.synthesize.mockRejectedValue({ statusCode: 422, message: 'invalid text' });
    const res = createRes();

    await controller.synthesize(
      {
        user: { userId: 9 },
        body: { text: 'hello', sessionId: 's-1' },
      },
      res
    );

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      code: 422,
      message: 'invalid text',
      data: null,
    });
  });

  it('falls back to generic 500 message when no error metadata exists', async () => {
    voiceService.getSessions.mockRejectedValue({});
    const res = createRes();

    await controller.getSessions(
      {
        user: { userId: 9 },
        query: { page: '1', pageSize: '10' },
      },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body.code).toBe(500);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.data).toBeNull();
  });
});
