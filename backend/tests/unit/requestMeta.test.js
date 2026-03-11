'use strict';

const { getClientIp, getRequestContext } = require('../../src/utils/requestMeta');

describe('requestMeta', () => {
  it('prefers the first forwarded ip when present', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
      ip: '127.0.0.1',
      requestId: 'req-10',
    };

    expect(getClientIp(req)).toBe('203.0.113.10');
    expect(getRequestContext(req)).toEqual({
      ipAddress: '203.0.113.10',
      userAgent: '',
      requestId: 'req-10',
    });
  });

  it('falls back to req.ip when no proxy chain exists', () => {
    const req = {
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
      requestId: 'req-11',
    };

    expect(getRequestContext(req)).toEqual({
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req-11',
    });
  });
});
