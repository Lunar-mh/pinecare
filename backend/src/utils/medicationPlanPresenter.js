'use strict';

function normalizeDate(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }
  return date.toISOString().slice(0, 10);
}

function presentPlan(plan) {
  if (!plan) return null;

  return {
    id: Number(plan.id),
    user_id: Number(plan.user_id),
    medication_name: plan.medication_name,
    dosage: plan.dosage,
    frequency: plan.frequency,
    remind_times: Array.isArray(plan.remind_times) ? plan.remind_times : [],
    start_date: normalizeDate(plan.start_date),
    end_date: normalizeDate(plan.end_date),
    remaining_quantity:
      plan.remaining_quantity === undefined || plan.remaining_quantity === null
        ? null
        : Number(plan.remaining_quantity),
    reminder_threshold: Number(plan.reminder_threshold),
    is_active: Number(plan.is_active) === 1,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  };
}

function presentPlanList(plans) {
  if (!Array.isArray(plans)) return [];
  return plans.map(presentPlan);
}

module.exports = {
  presentPlan,
  presentPlanList,
};
