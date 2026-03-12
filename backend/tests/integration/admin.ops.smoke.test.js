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

const { query } = require('../../src/config/database');
const app = require('../../src/app');

function createAdminToken() {
  return jwt.sign({ userId: 0, role: 'admin', isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

describe('admin ops smoke', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'admin-ops-smoke-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/admin/health/overview returns list and pagination', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            user_id: 1,
            nickname: 'Alice',
            phone: '13800000000',
            age: 70,
            bp_systolic: 150,
            bp_diastolic: 95,
            bp_measured_at: '2026-03-10 10:00:00',
            heart_rate: 88,
            hr_measured_at: '2026-03-10 10:00:00',
            blood_sugar: 6.8,
            bs_measured_at: '2026-03-10 10:00:00',
            last_update: '2026-03-10 10:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/health/overview?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.pagination.total).toBe(1);
    expect(res.body.data.list[0].riskLevel).toBe('warning');
  });

  it('GET /api/v1/admin/medication/logs returns logs', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            id: 11,
            user_id: 2,
            nickname: 'Bob',
            phone: '13900000000',
            plan_id: 9,
            medication_name: 'Aspirin',
            dosage: '100mg',
            scheduled_time: '2026-03-10 08:00:00',
            actual_time: null,
            status: 'pending',
            reminder_sent: 1,
            second_reminder_sent: 0,
            family_notified: 0,
            created_at: '2026-03-10 07:00:00',
            updated_at: '2026-03-10 07:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/medication/logs?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].medicationName).toBe('Aspirin');
  });

  it('GET /api/v1/admin/family/bindings returns paged bindings', async () => {
    query
      .mockResolvedValueOnce([
        [{ Field: 'id' }, { Field: 'elder_id' }, { Field: 'family_id' }, { Field: 'status' }],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 31,
            elder_id: 8,
            family_id: 18,
            status: 'active',
            binding_created_at: '2026-03-10 10:00:00',
            elder_nickname: 'Elder8',
            elder_name: 'Elder Name',
            elder_avatar: null,
            elder_gender: 'female',
            elder_age: 72,
            health_archive_id: 99,
            health_updated_at: '2026-03-10 11:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/family/bindings?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].bindingId).toBe(31);
    expect(res.body.data.list[0].elderProfile.realName).toBe('Elder Name');
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('GET /api/v1/admin/medical/reports returns paged reports', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            id: 61,
            user_id: 3,
            report_no: 'RPT-001',
            report_type: 'blood',
            report_date: '2026-03-10',
            report_url: 'https://example.com/r/61',
            report_data: '{"a":1}',
            sync_status: 'synced',
            created_at: '2026-03-10 09:00:00',
            nickname: 'Carol',
            phone: '13700000000',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/medical/reports?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].reportNo).toBe('RPT-001');
    expect(res.body.data.list[0].userName).toBe('Carol');
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('GET /api/v1/admin/gps/current returns latest locations', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            id: 21,
            user_id: 3,
            nickname: 'Carol',
            phone: '13700000000',
            age: 66,
            latitude: 31.23,
            longitude: 121.47,
            accuracy: 10,
            location_type: 'gps',
            created_at: '2026-03-10 10:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/gps/current?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].userId).toBe(3);
  });

  it('GET /api/v1/admin/sos/events returns list and summary', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            id: 100,
            user_id: 1,
            nickname: 'Alice',
            phone: '13800000000',
            trigger_type: 'manual',
            latitude: 31.2,
            longitude: 121.4,
            address: 'Shanghai',
            event_status: 'triggered',
            created_at: '2026-03-10 10:00:00',
            confirmed_at: null,
            resolved_at: null,
            cancelled_at: null,
            updated_at: '2026-03-10 10:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([
        [
          {
            sos_event_id: 100,
            notify_type: 'wechat',
            pending_count: 0,
            sent_count: 1,
            failed_count: 0,
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          {
            id: 900,
            sos_event_id: 100,
            contact_id: 77,
            contact_name: 'Family One',
            notify_type: 'wechat',
            notify_target: 'openid-1',
            status: 'sent',
            retry_count: 0,
            error_message: null,
            sent_at: '2026-03-10 10:01:00',
            created_at: '2026-03-10 10:00:00',
            updated_at: '2026-03-10 10:01:00',
          },
        ],
      ]);

    const res = await request(app)
      .get('/api/v1/admin/sos/events?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].event_id).toBe(100);
    expect(res.body.data.list[0].notification_summary.total.sent).toBe(1);
    expect(res.body.data.list[0].notification_delivery.sentCount).toBe(1);
  });

  it('GET /api/v1/admin/fall/events returns paged events', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            id: 500,
            user_id: 7,
            nickname: 'Elder7',
            phone: '13600000000',
            status: 'detecting',
            sensor_data: '{"verticalPeak":2.5}',
            sensitivity: 'high',
            detected_at: '2026-03-10 10:00:00',
            cancelled_at: null,
            confirmed_at: null,
            created_at: '2026-03-10 10:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/fall/events?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].id).toBe(500);
    expect(res.body.data.list[0].sensorData.verticalPeak).toBe(2.5);
  });

  it('GET /api/v1/admin/drug-interactions returns records', async () => {
    query.mockResolvedValueOnce([
      [
        {
          id: 81,
          user_id: 2,
          nickname: 'Bob',
          phone: '13900000000',
          drug_a: 'Aspirin',
          drug_b: 'Warfarin',
          level: 'high',
          mechanism: 'anti-coagulation overlap',
          risk_description: 'Bleeding risk',
          suggestion: 'consult doctor',
          status: 'pending',
          check_batch_id: 'batch_1',
          created_at: '2026-03-10 10:00:00',
        },
      ],
    ]);

    const res = await request(app)
      .get('/api/v1/admin/drug-interactions?status=pending')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data[0].drugA).toBe('Aspirin');
  });

  it('GET /api/v1/admin/time-bank/service/history returns paged records', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            id: 21,
            provider_id: 1,
            recipient_id: 2,
            service_type: 'escort',
            start_time: '2026-03-10 09:00:00',
            end_time: '2026-03-10 10:00:00',
            duration_hours: 1,
            time_coins: 1,
            status: 'pending',
            created_at: '2026-03-10 10:00:00',
            provider_nickname: 'Provider',
            provider_phone: '13800000000',
            recipient_nickname: 'Recipient',
            recipient_phone: '13900000000',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/time-bank/service/history?page=1&pageSize=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].id).toBe(21);
  });

  it('GET /api/v1/admin/time-bank/exchange/history returns records', async () => {
    query.mockResolvedValueOnce([
      [
        {
          id: 31,
          user_id: 1,
          exchange_type: 'medical',
          item_name: 'Checkup Coupon',
          coins_required: 20,
          status: 'completed',
          created_at: '2026-03-10 10:00:00',
          completed_at: '2026-03-10 10:10:00',
        },
      ],
    ]);

    const res = await request(app)
      .get('/api/v1/admin/time-bank/exchange/history')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data[0].id).toBe(31);
  });

  it('GET /api/v1/admin/time-bank/leaderboard returns ranks', async () => {
    query.mockResolvedValueOnce([
      [
        {
          user_id: 1,
          balance: 100,
          total_earned: 200,
          credit_score: 95,
          credit_level: 'angel',
        },
      ],
    ]);

    const res = await request(app)
      .get('/api/v1/admin/time-bank/leaderboard?limit=10')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data[0].rank).toBe(1);
    expect(res.body.data[0].userId).toBe(1);
  });

  it('GET /api/v1/admin/system/integrations returns diagnostics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/system/integrations')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.some((item) => item.key === 'medical')).toBe(true);
    expect(res.body.data.items.some((item) => item.key === 'competition_seed')).toBe(true);
    expect(res.body.data.runtimeMode).toBeTruthy();

    const wechatItem = res.body.data.items.find((item) => item.key === 'wechat_notify');
    expect(wechatItem).toEqual(
      expect.objectContaining({
        configured: expect.any(Boolean),
        mode: expect.any(String),
        effectiveMode: expect.any(String),
        fallbackAllowed: expect.any(Boolean),
        source: 'wechat_template_api',
        healthy: expect.any(Boolean),
      })
    );
    expect(Array.isArray(wechatItem.missingConfig)).toBe(true);
  });

  it('GET /api/v1/admin/system/audit-logs returns paged logs', async () => {
    query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            user_id: 99,
            action: 'admin.demo.bootstrap',
            ip_address: '127.0.0.1',
            user_agent: 'jest',
            details: '{"scenarioId":"medical-consultation"}',
            created_at: '2026-03-10 10:00:00',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app)
      .get('/api/v1/admin/system/audit-logs?page=1&pageSize=20')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list[0].action).toBe('admin.demo.bootstrap');
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('GET /api/v1/admin/system/demo/scenarios returns curated scenarios', async () => {
    const res = await request(app)
      .get('/api/v1/admin/system/demo/scenarios')
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data.scenarios)).toBe(true);
    expect(res.body.data.scenarios[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        order: expect.any(Number),
      })
    );
  });

  it('POST /api/v1/admin/system/demo/bootstrap returns replay context', async () => {
    query.mockResolvedValueOnce([{ insertId: 1 }]);

    const res = await request(app)
      .post('/api/v1/admin/system/demo/bootstrap')
      .set('Authorization', `Bearer ${createAdminToken()}`)
      .send({ scenarioId: 'medical-consultation' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.scenarioId).toBe('medical-consultation');
    expect(res.body.data.status).toBe('ready');
    expect(Array.isArray(res.body.data.replayLog)).toBe(true);
    expect(res.body.data.competitionDataAssets.commands).toContain('npm run seed:competition:sql');
  });
});

