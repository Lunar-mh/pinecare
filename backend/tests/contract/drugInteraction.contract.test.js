'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../../src/middleware/auth', () => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
        data: null,
      });
    }

    req.user = { userId: 9009 };
    return next();
  };
});

jest.mock('../../src/services/drugInteractionService', () => ({
  checkInteractions: jest.fn().mockResolvedValue({
    checkBatchId: 'batch_mock_001',
    highestRiskLevel: 'D',
    interactionCount: 1,
    interactions: [
      {
        id: 1,
        userId: 9009,
        drugA: '辛伐他汀',
        drugB: '克拉霉素',
        level: 'D',
        mechanism: '代谢抑制',
        riskDescription: '肌病风险升高',
        suggestion: '建议更换抗生素',
        status: 'pending',
        checkBatchId: 'batch_mock_001',
      },
    ],
  }),
  getHistory: jest.fn().mockResolvedValue([
    {
      id: 1,
      userId: 9009,
      drugA: '辛伐他汀',
      drugB: '克拉霉素',
      level: 'D',
      status: 'pending',
    },
  ]),
  acknowledgeRisk: jest.fn().mockResolvedValue({
    id: 1,
    userId: 9009,
    status: 'acknowledged',
  }),
  checkContraindication: jest.fn().mockResolvedValue([
    {
      drugName: '布洛芬',
      diseaseCode: 'D-ULCER',
      diseaseName: '消化性溃疡',
      severity: 'high',
    },
  ]),
  getFoodInteractions: jest.fn().mockResolvedValue([
    {
      id: 100,
      drugName: '辛伐他汀',
      foodName: '葡萄柚',
      interactionType: '代谢抑制',
      description: '血药浓度升高',
      suggestion: '避免同服',
    },
  ]),
}));

const router = require('../../src/routes/drugInteraction');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/drug-interaction', router);
  return app;
}

function expectContractShape(body) {
  expect(body).toHaveProperty('code');
  expect(body).toHaveProperty('message');
  expect(body).toHaveProperty('data');
}

describe('用药交互 API 契约测试', () => {
  it('POST /drug-interaction/check 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/drug-interaction/check')
      .set('Authorization', 'Bearer valid-token')
      .send({ drugList: ['辛伐他汀', '克拉霉素'] });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /drug-interaction/history 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/drug-interaction/history?status=pending')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('POST /drug-interaction/acknowledge 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/drug-interaction/acknowledge')
      .set('Authorization', 'Bearer valid-token')
      .send({ interactionId: 1 });

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /drug-interaction/contraindication 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/drug-interaction/contraindication')
      .query({ drugName: '布洛芬' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('GET /drug-interaction/food 响应结构正确', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/drug-interaction/food')
      .query({ drugName: '辛伐他汀' })
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expectContractShape(res.body);
  });

  it('缺少鉴权头时返回 401', async () => {
    const app = createApp();
    const res = await request(app).get('/drug-interaction/history');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: 401,
      message: '未提供认证令牌',
      data: null,
    });
  });
});
