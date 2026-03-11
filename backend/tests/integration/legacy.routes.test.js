'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  ping: jest.fn().mockResolvedValue('PONG'),
  on: jest.fn(),
}));

jest.mock('../../src/services/timeBankService', () => ({
  getAccount: jest.fn().mockResolvedValue({
    balance: 88,
    totalEarned: 120,
  }),
}));

jest.mock('../../src/services/locationService', () => ({
  getCurrent: jest.fn().mockResolvedValue({
    latitude: 31.23,
    longitude: 121.47,
  }),
  upload: jest.fn(),
}));

jest.mock('../../src/services/locationTrailService', () => ({
  getTrail: jest.fn(),
}));

jest.mock('../../src/services/fenceService', () => ({
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  toggle: jest.fn(),
}));

jest.mock('../../src/controllers/userController', () => ({
  getProfile: jest.fn((req, res) =>
    res.json({
      code: 0,
      message: 'ok',
      data: {
        userId: req.user.userId,
        nickname: 'LegacyUser',
      },
    })
  ),
  updateProfile: jest.fn(),
  listEmergencyContacts: jest.fn(),
  createEmergencyContact: jest.fn(),
  updateEmergencyContact: jest.fn(),
  setPrimaryContact: jest.fn(),
  deleteEmergencyContact: jest.fn(),
  createBindingQrcode: jest.fn(),
  approveBinding: jest.fn(),
  deleteAccount: jest.fn(),
  unlockAccount: jest.fn(),
}));

jest.mock('../../src/controllers/companionController', () => ({
  chat: jest.fn(),
  getGames: jest.fn((_req, res) =>
    res.json({
      code: 0,
      message: 'ok',
      data: [{ id: 'memory-cards', title: 'Memory Cards' }],
    })
  ),
  recordGame: jest.fn(),
  getEmotion: jest.fn(),
  getNostalgia: jest.fn(),
}));

const app = require('../../src/app');

function createToken() {
  return jwt.sign({ userId: 7, role: 'user' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

function expectDeprecatedHeaders(res, successorPath) {
  expect(res.headers.deprecation).toBe('true');
  expect(res.headers.sunset).toBeTruthy();
  expect(res.headers.warning).toContain('Deprecated API');
  expect(res.headers.link).toContain(successorPath);
}

describe('legacy compatibility routes', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'legacy-routes-secret';
  });

  it('GET /timebank/account keeps working with deprecation headers', async () => {
    const res = await request(app)
      .get('/timebank/account')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.balance).toBe(88);
    expectDeprecatedHeaders(res, '/time-bank');
  });

  it('GET /location/current keeps working with deprecation headers', async () => {
    const res = await request(app)
      .get('/location/current')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.latitude).toBe(31.23);
    expectDeprecatedHeaders(res, '/gps');
  });

  it('GET /companion/games keeps working with deprecation headers', async () => {
    const res = await request(app).get('/companion/games');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data[0].id).toBe('memory-cards');
    expectDeprecatedHeaders(res, '/ai-companion/companion');
  });

  it('GET /user/info keeps working with deprecation headers', async () => {
    const res = await request(app)
      .get('/user/info')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.nickname).toBe('LegacyUser');
    expectDeprecatedHeaders(res, '/user/profile');
  });
});
