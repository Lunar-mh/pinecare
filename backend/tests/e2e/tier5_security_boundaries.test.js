'use strict';

const request = require('supertest');
const { app, mockHarness } = require('./helpers/setupE2e');

describe('Tier 5: 安全纵深边界与裁撤接口验证 (Adversarial & Deprecation)', () => {
  const elderId = 1001;
  let elderToken;

  beforeEach(() => {
    mockHarness.resetStore();
    elderToken = mockHarness.createAuthHeader(elderId);
  });

  it('TC-SEC-MED-01: 拦截零剂量用药计划创建', async () => {
    const res = await request(app)
      .post('/medication/plans')
      .set('Authorization', elderToken)
      .send({
        medication_name: '阿司匹林',
        dosage: '0mg',
        frequency: 'once_daily',
        remind_times: ['08:00'],
        start_date: '2026-11-25',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('TC-SEC-MED-02: 拦截用药计划名称中的 XSS 脚本负载', async () => {
    const res = await request(app)
      .post('/medication/plans')
      .set('Authorization', elderToken)
      .send({
        medication_name: '<img src=x onerror=alert(1)>',
        dosage: '1片',
        frequency: 'once_daily',
        remind_times: ['08:00'],
        start_date: '2026-11-25',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('TC-SEC-MED-03: 允许正常半片或小数剂量 (0.5片)', async () => {
    const res = await request(app)
      .post('/medication/plans')
      .set('Authorization', elderToken)
      .send({
        medication_name: '降压药',
        dosage: '0.5片',
        frequency: 'once_daily',
        remind_times: ['08:00'],
        start_date: '2026-11-25',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  it('TC-SEC-ROUTE-01: 确认已裁撤业务与管理接口均不可达 (404)', async () => {
    const adminToken = mockHarness.createAuthHeader(3001, { role: 'admin' });

    const retiredPaths = [
      '/api/v1/statistics/overview',
      '/api/v1/time-bank/account',
      '/api/v1/voice/recognize',
      '/api/v1/community/medical/reports',
      '/api/v1/community/drug-interactions',
      '/api/v1/community/time-bank/leaderboard',
      '/api/v1/admin/time-bank/leaderboard',
    ];

    for (const path of retiredPaths) {
      const res = await request(app).get(path).set('Authorization', adminToken);
      expect(res.status).toBe(404);
    }
  });
});
