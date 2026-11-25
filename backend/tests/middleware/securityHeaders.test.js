'use strict';

const securityHeaders = require('../../src/middleware/securityHeaders');

function createRes() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

describe('securityHeaders middleware', () => {
  it('sets default security headers', () => {
    const req = { secure: false };
    const res = createRes();
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['Referrer-Policy']).toBe('same-origin');
    expect(res.headers['Permissions-Policy']).toBe('camera=(), microphone=(self), geolocation=(self)');
    expect(res.headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(res.headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('adds HSTS for secure requests', () => {
    const req = { secure: true };
    const res = createRes();
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
  });
});
