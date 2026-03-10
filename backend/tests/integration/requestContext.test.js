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
});
