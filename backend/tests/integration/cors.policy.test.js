'use strict';

const express = require('express');
const cors = require('cors');
const request = require('supertest');
const { buildCorsOptions } = require('../../src/config/http');
const errorHandler = require('../../src/middleware/errorHandler');
const requestContext = require('../../src/middleware/requestContext');

describe('cors policy', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function createApp() {
    const app = express();
    app.use(requestContext);
    app.use(cors(buildCorsOptions()));
    app.get('/ping', (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);
    return app;
  }

  it('allows configured origins', async () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://admin.example.com';
    process.env.PRODUCTION_LIVE = '1';
    process.env.COMPETITION_SANDBOX = '0';

    const res = await request(createApp())
      .get('/ping')
      .set('Origin', 'https://admin.example.com');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://admin.example.com');
  });

  it('rejects non-whitelisted origins', async () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://admin.example.com';
    process.env.PRODUCTION_LIVE = '1';
    process.env.COMPETITION_SANDBOX = '0';

    const res = await request(createApp())
      .get('/ping')
      .set('Origin', 'https://evil.example.com');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('CORS origin not allowed.');
  });
});
