'use strict';

jest.mock('../../src/models/medicationPlanModel', () => ({
  listByUserId: jest.fn(),
  create: jest.fn(),
  getByIdAndUser: jest.fn(),
  updateByIdAndUser: jest.fn(),
  deleteByIdAndUser: jest.fn(),
}));

const medicationPlanModel = require('../../src/models/medicationPlanModel');
const medicationPlanService = require('../../src/services/medicationPlanService');

describe('medicationPlanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists plans by user id', async () => {
    medicationPlanModel.listByUserId.mockResolvedValue([{ id: 1 }]);

    const result = await medicationPlanService.listPlans(9);

    expect(medicationPlanModel.listByUserId).toHaveBeenCalledWith(9);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('validates required creation fields and frequency enum', async () => {
    await expect(medicationPlanService.createPlan(1, {})).rejects.toMatchObject({
      code: 400,
      message: 'medication_name is required.',
    });

    await expect(
      medicationPlanService.createPlan(1, {
        medication_name: 'Drug',
        dosage: '1 tablet',
        frequency: 'weekly',
        remind_times: ['08:00'],
        start_date: '2026-03-11',
      })
    ).rejects.toMatchObject({
      code: 400,
      message: 'frequency is invalid.',
    });
  });

  it('creates plan with normalized numeric defaults', async () => {
    medicationPlanModel.create.mockResolvedValue({ id: 3 });

    const result = await medicationPlanService.createPlan(5, {
      medication_name: 'Drug',
      dosage: '1 tablet',
      frequency: 'once_daily',
      remind_times: ['08:00', '08:00'],
      start_date: '2026-03-11T09:00:00.000Z',
      remaining_quantity: '10',
      is_active: true,
    });

    expect(medicationPlanModel.create).toHaveBeenCalledWith({
      user_id: 5,
      medication_name: 'Drug',
      dosage: '1 tablet',
      frequency: 'once_daily',
      remind_times: ['08:00'],
      start_date: '2026-03-11',
      end_date: undefined,
      remaining_quantity: 10,
      reminder_threshold: 3,
      is_active: 1,
    });
    expect(result).toEqual({ id: 3 });
  });

  it('rejects invalid remind_times and date order', async () => {
    await expect(
      medicationPlanService.createPlan(1, {
        medication_name: 'Drug',
        dosage: '1 tablet',
        frequency: 'once_daily',
        remind_times: ['25:00'],
        start_date: '2026-03-11',
      })
    ).rejects.toMatchObject({
      code: 400,
      message: 'Invalid reminder time: 25:00',
    });

    await expect(
      medicationPlanService.createPlan(1, {
        medication_name: 'Drug',
        dosage: '1 tablet',
        frequency: 'once_daily',
        remind_times: ['08:00'],
        start_date: '2026-03-11',
        end_date: '2026-03-10',
      })
    ).rejects.toMatchObject({
      code: 400,
      message: 'end_date must not be earlier than start_date.',
    });
  });

  it('requires existing plan before update delete and get', async () => {
    medicationPlanModel.getByIdAndUser.mockResolvedValue(null);

    await expect(
      medicationPlanService.updatePlan(1, 2, { dosage: '1 tablet' })
    ).rejects.toMatchObject({
      code: 404,
    });
    await expect(medicationPlanService.deletePlan(1, 2)).rejects.toMatchObject({
      code: 404,
    });
    await expect(medicationPlanService.getPlanById(1, 2)).rejects.toMatchObject({
      code: 404,
    });
  });

  it('rejects empty update payload after normalization', async () => {
    medicationPlanModel.getByIdAndUser.mockResolvedValue({
      id: 2,
      start_date: '2026-03-11',
      end_date: null,
    });

    await expect(medicationPlanService.updatePlan(1, 2, {})).rejects.toMatchObject({
      code: 400,
      message: 'At least one updatable field is required.',
    });
  });

  it('updates plan with normalized payload', async () => {
    medicationPlanModel.getByIdAndUser.mockResolvedValue({
      id: 2,
      start_date: '2026-03-11',
      end_date: null,
    });
    medicationPlanModel.updateByIdAndUser.mockResolvedValue({ id: 2, dosage: '2 tablets' });

    const result = await medicationPlanService.updatePlan(1, 2, {
      dosage: '2 tablets',
      remind_times: ['20:00', '08:00'],
      is_active: false,
    });

    expect(medicationPlanModel.updateByIdAndUser).toHaveBeenCalledWith(2, 1, {
      medication_name: undefined,
      dosage: '2 tablets',
      frequency: undefined,
      remind_times: ['08:00', '20:00'],
      start_date: undefined,
      end_date: undefined,
      remaining_quantity: undefined,
      reminder_threshold: undefined,
      is_active: 0,
    });
    expect(result).toEqual({ id: 2, dosage: '2 tablets' });
  });

  it('deletes plan and returns deletion payload', async () => {
    medicationPlanModel.getByIdAndUser.mockResolvedValue({ id: 8 });

    const result = await medicationPlanService.deletePlan(1, 8);

    expect(medicationPlanModel.deleteByIdAndUser).toHaveBeenCalledWith(8, 1);
    expect(result).toEqual({ deleted: true, plan_id: 8 });
  });

  it('rejects zero or negative dosage and xss payloads', async () => {
    await expect(
      medicationPlanService.createPlan(1, {
        medication_name: 'Aspirin',
        dosage: '0mg',
        frequency: 'once_daily',
        remind_times: ['08:00'],
        start_date: '2026-03-11',
      })
    ).rejects.toMatchObject({ code: 400, message: 'dosage must be greater than zero.' });

    await expect(
      medicationPlanService.createPlan(1, {
        medication_name: '<script>alert(1)</script>',
        dosage: '1 tablet',
        frequency: 'once_daily',
        remind_times: ['08:00'],
        start_date: '2026-03-11',
      })
    ).rejects.toMatchObject({ code: 400, message: 'medication_name contains unsafe characters.' });
  });
});
