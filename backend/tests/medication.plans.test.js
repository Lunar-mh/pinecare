'use strict';

const request = require('supertest');
const express = require('express');
const { createMedicationPlanPayload } = require('./helpers/medicationPlanFactory');

jest.mock('../src/middleware/auth', () => {
  return (req, _res, next) => {
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

describe('medication plans api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /medication/plans returns current user plan list', async () => {
    medicationPlanService.listPlans.mockResolvedValue([
      {
        id: 1,
        user_id: 1001,
        medication_name: 'Blood Pressure Tablet',
        dosage: '1 tablet',
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
    expect(res.body.message).toBe('Medication plans loaded.');
    expect(res.body.data.length).toBe(1);
    expect(medicationPlanService.listPlans).toHaveBeenCalledWith(1001);
  });

  it('POST /medication/plans creates a plan', async () => {
    medicationPlanService.createPlan.mockResolvedValue({
      id: 2,
      user_id: 1001,
      medication_name: 'Vitamin C',
      dosage: '2 pills',
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
      medication_name: 'Vitamin C',
      dosage: '2 pills',
      frequency: 'twice_daily',
      remind_times: ['08:00', '20:00'],
    });

    const res = await request(app).post('/medication/plans').send(payload);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('Medication plan created.');
    expect(res.body.data.medication_name).toBe('Vitamin C');
  });

  it('PUT /medication/plans/:id updates a plan', async () => {
    medicationPlanService.updatePlan.mockResolvedValue({
      id: 2,
      user_id: 1001,
      medication_name: 'Vitamin B',
      dosage: '1 pill',
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
      .send({ medication_name: 'Vitamin B', dosage: '1 pill', remind_times: ['09:00'] });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('Medication plan updated.');
    expect(medicationPlanService.updatePlan).toHaveBeenCalledWith(1001, 2, {
      medication_name: 'Vitamin B',
      dosage: '1 pill',
      remind_times: ['09:00'],
    });
  });

  it('DELETE /medication/plans/:id deletes a plan', async () => {
    medicationPlanService.deletePlan.mockResolvedValue({ deleted: true, plan_id: 2 });

    const app = createApp();
    const res = await request(app).delete('/medication/plans/2');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('Medication plan deleted.');
    expect(res.body.data.plan_id).toBe(2);
  });
});
