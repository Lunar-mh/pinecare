'use strict';

const request = require('supertest');
const app = require('../../src/app');

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
});
