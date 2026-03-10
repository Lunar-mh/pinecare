'use strict';

const request = require('supertest');
const express = require('express');
const { createMedicationPlanPayload } = require('./helpers/medicationPlanFactory');

jest.mock('../src/middleware/auth', () => {
  return (req, res, next) => {
    req.user = { userId: 1001 };
    next();
  };
});

jest.mock('../src/services/medicationPlanService', () => ({
  listPlans: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  deletePlan: jest.fn(),
}));

const medicationPlanService = require('../src/services/medicationPlanService');
const medicationPlanRoutes = require('../src/routes/medicationPlanRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/medication/plans', medicationPlanRoutes);
  return app;
}

describe('用药计划接口集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /medication/plans 返回当前用户计划列表', async () => {
    medicationPlanService.listPlans.mockResolvedValue([
      {
        id: 1,
        user_id: 1001,
        medication_name: '降压药',
        dosage: '1片',
        frequency: 'once_daily',
        remind_times: ['08:00'],
        start_date: '2026-02-21',
        end_date: null,
        remaining_quantity: 20,
        reminder_threshold: 3,
        is_active: 1,
      },
    ]);

    const app = createApp();
    const res = await request(app).get('/medication/plans');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('获取用药计划成功');
    expect(res.body.data.length).toBe(1);
    expect(medicationPlanService.listPlans).toHaveBeenCalledWith(1001);
  });

  it('POST /medication/plans 创建计划成功', async () => {
    medicationPlanService.createPlan.mockResolvedValue({
      id: 2,
      user_id: 1001,
      medication_name: '维生素',
      dosage: '2粒',
      frequency: 'twice_daily',
      remind_times: ['08:00', '20:00'],
      start_date: '2026-02-21',
      end_date: '2026-03-01',
      remaining_quantity: 40,
      reminder_threshold: 3,
      is_active: 1,
    });

    const app = createApp();
    const payload = createMedicationPlanPayload({
      medication_name: '维生素',
      dosage: '2粒',
      frequency: 'twice_daily',
      remind_times: ['08:00', '20:00'],
    });

    const res = await request(app).post('/medication/plans').send(payload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('创建用药计划成功');
    expect(res.body.data.medication_name).toBe('维生素');
  });

  it('PUT /medication/plans/:id 更新计划成功', async () => {
    medicationPlanService.updatePlan.mockResolvedValue({
      id: 2,
      user_id: 1001,
      medication_name: '维生素B',
      dosage: '1粒',
      frequency: 'once_daily',
      remind_times: ['09:00'],
      start_date: '2026-02-21',
      end_date: null,
      remaining_quantity: 20,
      reminder_threshold: 3,
      is_active: 1,
    });

    const app = createApp();
    const res = await request(app)
      .put('/medication/plans/2')
      .send({ medication_name: '维生素B', dosage: '1粒', remind_times: ['09:00'] });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('更新用药计划成功');
    expect(medicationPlanService.updatePlan).toHaveBeenCalledWith(1001, 2, {
      medication_name: '维生素B',
      dosage: '1粒',
      remind_times: ['09:00'],
    });
  });

  it('DELETE /medication/plans/:id 删除计划成功', async () => {
    medicationPlanService.deletePlan.mockResolvedValue({ deleted: true, plan_id: 2 });

    const app = createApp();
    const res = await request(app).delete('/medication/plans/2');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('删除用药计划成功');
    expect(res.body.data.plan_id).toBe(2);
  });
});
