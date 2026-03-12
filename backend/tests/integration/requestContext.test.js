'use strict';

const express = require('express');
const request = require('supertest');
const app = require('../../src/app');
const requestContext = require('../../src/middleware/requestContext');

describe('requestContext middleware', () => {
  it('adds x-request-id when header is absent', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('echoes incoming x-request-id when valid', async () => {
    const response = await request(app).get('/').set('x-request-id', 'competition-demo-001');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('competition-demo-001');
  });

  it('accepts x-requestid alias and regenerates invalid values', async () => {
    let response = await request(app).get('/').set('x-requestid', 'legacy-demo-002');
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('legacy-demo-002');

    response = await request(app)
      .get('/')
      .set('x-request-id', 'x'.repeat(101));
    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-request-id']).not.toBe('x'.repeat(101));
  });

  it('injects request metadata using trusted proxy resolution', async () => {
    const localApp = express();
    localApp.set('trust proxy', 1);
    localApp.use(requestContext);
    localApp.get('/meta', (req, res) => {
      res.json({
        requestId: req.requestId,
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
      });
    });

    const response = await request(localApp)
      .get('/meta')
      .set('x-forwarded-for', '203.0.113.10, 10.0.0.3')
      .set('user-agent', 'proxy-test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      requestId: expect.any(String),
      ipAddress: '203.0.113.10',
      userAgent: 'proxy-test',
    });
  });
});
