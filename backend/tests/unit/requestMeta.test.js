'use strict';

const { getClientIp, getRequestContext } = require('../../src/utils/requestMeta');

describe('requestMeta', () => {
  it('prefers req.ip when express has already resolved the proxy chain', () => {
    const req = {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
      ip: '203.0.113.10',
      requestId: 'req-10',
    };

    expect(getClientIp(req)).toBe('203.0.113.10');
    expect(getRequestContext(req)).toEqual({
      ipAddress: '203.0.113.10',
      userAgent: '',
      requestId: 'req-10',
    });
  });

  it('falls back to forwarded headers when req.ip is unavailable', () => {
    const req = {
      headers: { 'x-forwarded-for': '198.51.100.25, 10.0.0.2', 'user-agent': 'jest' },
      requestId: 'req-11',
    };

    expect(getRequestContext(req)).toEqual({
      ipAddress: '198.51.100.25',
      userAgent: 'jest',
      requestId: 'req-11',
    });
  });
});
