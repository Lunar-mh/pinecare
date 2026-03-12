'use strict';

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const {
  sanitizeText,
  sanitizeObject,
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
  getRecentThirdPartyErrors,
  clearRecentThirdPartyErrors,
  maskIdCard,
  maskPhone,
} = require('../../src/utils/thirdParty');

describe('thirdParty utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRecentThirdPartyErrors();
  });

  it('sanitizeText should redact token and urls', () => {
    const input = 'Bearer abc.def.123 token=secret123 https://example.com/path';
    const output = sanitizeText(input);

    expect(output).toContain('Bearer [REDACTED]');
    expect(output).toContain('token=[REDACTED]');
    expect(output).toContain('[REDACTED_URL]');
  });

  it('sanitizeText should mask phone and id card', () => {
    const input = 'phone 13812345678 id 310101199901011234';
    const output = sanitizeText(input);

    expect(output).toContain('138****5678');
    expect(output).toContain('310*************34');
  });

  it('sanitizeObject should redact sensitive fields recursively', () => {
    const output = sanitizeObject({
      token: 't1',
      nested: {
        accessKeyId: 'ak',
        normal: 'ok',
      },
      array: [{ authorization: 'Bearer abc' }],
    });

    expect(output.token).toBe('[REDACTED]');
    expect(output.nested.accessKeyId).toBe('[REDACTED]');
    expect(output.nested.normal).toBe('ok');
    expect(output.array[0].authorization).toBe('[REDACTED]');
  });

  it('sanitizeObject should mask phone/idcard fields by key', () => {
    const output = sanitizeObject({
      phone: '13812345678',
      id_card: '310101199901011234',
    });

    expect(output.phone).toBe('138****5678');
    expect(output.id_card).toBe('310*************34');
  });

  it('createUpstreamError should map timeout to 504', () => {
    const err = createUpstreamError({ code: 'ECONNABORTED' }, { timeout: 'timeout' });
    expect(err.code).toBe(504);
    expect(err.statusCode).toBe(504);
    expect(err.message).toBe('timeout');
  });

  it('createUpstreamError should map 429 to 503', () => {
    const err = createUpstreamError({ response: { status: 429 } }, { rateLimited: 'rate limit' });
    expect(err.code).toBe(503);
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe('rate limit');
  });

  it('createUpstreamError should map 5xx to unavailable message', () => {
    const err = createUpstreamError(
      { response: { status: 503 } },
      { unavailable: 'upstream down' }
    );
    expect(err.code).toBe(503);
    expect(err.statusCode).toBe(503);
    expect(err.message).toBe('upstream down');
  });

  it('isRetryableError should identify retryable status and timeout', () => {
    expect(isRetryableError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isRetryableError({ response: { status: 503 } })).toBe(true);
    expect(isRetryableError({ response: { status: 400 } })).toBe(false);
  });

  it('logThirdPartyError should send sanitized payload to unified logger', () => {
    logThirdPartyError(
      'medical',
      {
        code: 'ECONNABORTED',
        message: 'Bearer abc token=xyz',
        response: { status: 429, data: { api_key: 'raw-key' } },
      },
      { sessionUrl: 'https://example.com/token/abc' }
    );

    expect(logger.error).toHaveBeenCalledWith(
      'thirdParty',
      'upstream_error',
      expect.objectContaining({
        provider: 'medical',
        code: 'ECONNABORTED',
        status: 429,
        message: expect.not.stringContaining('abc'),
        response: expect.objectContaining({ api_key: '[REDACTED]' }),
        extra: expect.objectContaining({ sessionUrl: '[REDACTED_URL]' }),
      })
    );

    expect(getRecentThirdPartyErrors(1)).toEqual([
      expect.objectContaining({
        provider: 'medical',
        extra: expect.objectContaining({
          sessionUrl: '[REDACTED_URL]',
        }),
      }),
    ]);
  });

  it('mask helpers should keep expected edges', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
    expect(maskIdCard('310101199901011234')).toBe('310*************34');
  });
});
