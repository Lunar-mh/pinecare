'use strict';

const medicationPlanModel = require('../models/medicationPlanModel');
const medicationLogModel = require('../models/medicationLogModel');

function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(date) {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildScheduledTime(dateText, timeText) {
  return new Date(`${dateText}T${timeText}:00`);
}

const reminderScheduleService = {
  async collectDueReminders(now) {
    const current = now instanceof Date ? now : new Date(now || Date.now());
    const currentDate = formatDate(current);
    const currentTime = formatTime(current);

    const duePlans = await medicationPlanModel.listDuePlans(currentDate, currentTime);
    const scheduledTime = buildScheduledTime(currentDate, currentTime);

    const items = [];

    for (const plan of duePlans) {
      const log = await medicationLogModel.createPendingLog({
        user_id: plan.user_id,
        plan_id: plan.id,
        scheduled_time: scheduledTime,
      });

      items.push({ plan, log });
    }

    return {
      current_date: currentDate,
      current_time: currentTime,
      total: items.length,
      items,
    };
  },
};

module.exports = reminderScheduleService;
