'use strict';

const medicationPlanModel = require('../models/medicationPlanModel');

const VALID_FREQUENCIES = ['once_daily', 'twice_daily', 'three_times', 'as_needed'];

function createBizError(code, message, statusCode, data) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  err.data = data || null;
  return err;
}

function normalizeDate(input, fieldName) {
  if (input === undefined) return undefined;
  if (input === null || input === '') return null;

  const time = new Date(input).getTime();
  if (Number.isNaN(time)) {
    throw createBizError(400, `${fieldName}日期格式无效。`, 400);
  }

  return new Date(time).toISOString().slice(0, 10);
}

function normalizeRemindTimes(remindTimes, required) {
  if (remindTimes === undefined) return undefined;
  if (!Array.isArray(remindTimes)) {
    throw createBizError(400, 'remind_times必须为时间字符串数组。', 400);
  }

  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const cleaned = remindTimes
    .map((item) => String(item || '').trim())
    .filter((item) => item.length > 0);

  if (required && cleaned.length === 0) {
    throw createBizError(400, 'remind_times至少需要包含一个提醒时间。', 400);
  }

  cleaned.forEach((item) => {
    if (!regex.test(item)) {
      throw createBizError(400, `提醒时间格式无效：${item}`, 400);
    }
  });

  return Array.from(new Set(cleaned)).sort();
}

function normalizePayload(payload, options) {
  const isUpdate = Boolean(options && options.isUpdate);
  const safe = payload || {};

  const normalized = {
    medication_name:
      safe.medication_name === undefined ? undefined : String(safe.medication_name || '').trim(),
    dosage: safe.dosage === undefined ? undefined : String(safe.dosage || '').trim(),
    frequency: safe.frequency === undefined ? undefined : String(safe.frequency || '').trim(),
    remind_times: normalizeRemindTimes(safe.remind_times, !isUpdate),
    start_date: normalizeDate(safe.start_date, 'start_date'),
    end_date: normalizeDate(safe.end_date, 'end_date'),
    remaining_quantity:
      safe.remaining_quantity === undefined ||
      safe.remaining_quantity === null ||
      safe.remaining_quantity === ''
        ? safe.remaining_quantity === undefined
          ? undefined
          : null
        : Number(safe.remaining_quantity),
    reminder_threshold:
      safe.reminder_threshold === undefined ||
      safe.reminder_threshold === null ||
      safe.reminder_threshold === ''
        ? safe.reminder_threshold === undefined
          ? undefined
          : null
        : Number(safe.reminder_threshold),
    is_active:
      safe.is_active === undefined
        ? undefined
        : Number(safe.is_active) === 1 || safe.is_active === true
          ? 1
          : 0,
  };

  if (!isUpdate) {
    if (!normalized.medication_name) throw createBizError(400, 'medication_name不能为空。', 400);
    if (!normalized.dosage) throw createBizError(400, 'dosage不能为空。', 400);
    if (!normalized.frequency) throw createBizError(400, 'frequency不能为空。', 400);
    if (!normalized.start_date) throw createBizError(400, 'start_date不能为空。', 400);
  }

  if (normalized.frequency !== undefined && !VALID_FREQUENCIES.includes(normalized.frequency)) {
    throw createBizError(400, 'frequency取值无效。', 400);
  }

  if (
    normalized.remaining_quantity !== undefined &&
    normalized.remaining_quantity !== null &&
    (!Number.isInteger(normalized.remaining_quantity) || normalized.remaining_quantity < 0)
  ) {
    throw createBizError(400, 'remaining_quantity必须为大于等于 0 的整数。', 400);
  }

  if (
    normalized.reminder_threshold !== undefined &&
    normalized.reminder_threshold !== null &&
    (!Number.isInteger(normalized.reminder_threshold) || normalized.reminder_threshold < 0)
  ) {
    throw createBizError(400, 'reminder_threshold必须为大于等于 0 的整数。', 400);
  }

  if (normalized.start_date && normalized.end_date && normalized.end_date < normalized.start_date) {
    throw createBizError(400, 'end_date不能早于start_date。', 400);
  }

  return normalized;
}

const medicationPlanService = {
  async listPlans(userId) {
    return medicationPlanModel.listByUserId(userId);
  },

  async createPlan(userId, payload) {
    const normalized = normalizePayload(payload, { isUpdate: false });

    return medicationPlanModel.create({
      user_id: userId,
      medication_name: normalized.medication_name,
      dosage: normalized.dosage,
      frequency: normalized.frequency,
      remind_times: normalized.remind_times,
      start_date: normalized.start_date,
      end_date: normalized.end_date,
      remaining_quantity:
        normalized.remaining_quantity === undefined ? null : normalized.remaining_quantity,
      reminder_threshold:
        normalized.reminder_threshold === undefined || normalized.reminder_threshold === null
          ? 3
          : normalized.reminder_threshold,
      is_active: normalized.is_active === undefined ? 1 : normalized.is_active,
    });
  },

  async updatePlan(userId, planId, payload) {
    const existing = await medicationPlanModel.getByIdAndUser(planId, userId);
    if (!existing) throw createBizError(404, '未找到对应的用药计划或无权访问。', 404);

    const normalized = normalizePayload(payload, { isUpdate: true });
    if (Object.values(normalized).every((value) => value === undefined)) {
      throw createBizError(400, '至少需要提供一个可更新字段。', 400);
    }

    const nextStartDate =
      normalized.start_date === undefined ? existing.start_date : normalized.start_date;
    const nextEndDate = normalized.end_date === undefined ? existing.end_date : normalized.end_date;

    if (nextStartDate && nextEndDate && String(nextEndDate) < String(nextStartDate)) {
      throw createBizError(400, 'end_date不能早于start_date。', 400);
    }

    return medicationPlanModel.updateByIdAndUser(planId, userId, normalized);
  },

  async deletePlan(userId, planId) {
    const existing = await medicationPlanModel.getByIdAndUser(planId, userId);
    if (!existing) throw createBizError(404, '未找到对应的用药计划或无权访问。', 404);

    await medicationPlanModel.deleteByIdAndUser(planId, userId);
    return { deleted: true, plan_id: Number(planId) };
  },

  async getPlanById(userId, planId) {
    const plan = await medicationPlanModel.getByIdAndUser(planId, userId);
    if (!plan) throw createBizError(404, '未找到对应的用药计划或无权访问。', 404);
    return plan;
  },

  VALID_FREQUENCIES,
};

module.exports = medicationPlanService;