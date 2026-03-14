'use strict';

const medicationLogModel = require('../models/medicationLogModel');
const medicationPlanModel = require('../models/medicationPlanModel');
const { createBizError } = require('../utils/serviceError');


function normalizeDate(value, field) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    throw createBizError(400, `${field} 日期格式非法`, 400);
  }

  return new Date(time).toISOString().slice(0, 10);
}

const medicationLogService = {
  async getLogs(userId, query) {
    const startDate = normalizeDate(query && query.start_date, 'start_date');
    const endDate = normalizeDate(query && query.end_date, 'end_date');

    if (startDate && endDate && endDate < startDate) {
      throw createBizError(400, 'end_date 不能早于 start_date', 400);
    }

    const list = await medicationLogModel.listByUserAndDateRange(userId, startDate, endDate);

    return {
      list,
      filters: {
        start_date: startDate,
        end_date: endDate,
      },
      total: list.length,
    };
  },

  async getTodaySchedule(userId, rawDate) {
    const baseDate = normalizeDate(rawDate, 'date') || new Date().toISOString().slice(0, 10);
    const dayStart = `${baseDate} 00:00:00`;
    const dayEndExclusive = `${baseDate} 23:59:59`;
    const plans = await medicationPlanModel.listByUserId(userId);

    const activePlans = plans.filter((plan) => {
      if (Number(plan.is_active) !== 1) return false;
      if (plan.start_date && String(plan.start_date) > baseDate) return false;
      if (plan.end_date && String(plan.end_date) < baseDate) return false;
      return true;
    });

    for (const plan of activePlans) {
      const remindTimes =
        Array.isArray(plan.remind_times) && plan.remind_times.length > 0
          ? plan.remind_times
          : ['08:00'];

      for (const remindTime of remindTimes) {
        await medicationLogModel.createPendingLog({
          user_id: userId,
          plan_id: plan.id,
          scheduled_time: `${baseDate} ${remindTime}:00`,
        });
      }
    }

    const logs = await medicationLogModel.listByUserAndDay(userId, dayStart, dayEndExclusive);

    return logs.map((log) => ({
      log_id: Number(log.id),
      medication_id: String(log.plan_id),
      name: log.medication_name || '未命名药品',
      dosage: log.dosage || '',
      time: String(log.scheduled_time).slice(11, 16),
      scheduled_time: log.scheduled_time,
      status: log.status,
      taken_at: log.actual_time || null,
    }));
  },
};

module.exports = medicationLogService;
