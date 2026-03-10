'use strict';

function createMedicationPlanPayload(overrides) {
  return {
    medication_name: '降压药',
    dosage: '1片',
    frequency: 'once_daily',
    remind_times: ['08:00'],
    start_date: '2026-02-21',
    end_date: '2026-12-31',
    remaining_quantity: 30,
    reminder_threshold: 3,
    is_active: 1,
    ...(overrides || {}),
  };
}

module.exports = {
  createMedicationPlanPayload,
};
