'use strict';

const { fail } = require('../../utils/response');

const VALID_FREQUENCIES = ['once_daily', 'twice_daily', 'three_times', 'as_needed'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidDate(value) {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function validateRemindTimes(remindTimes) {
  if (!Array.isArray(remindTimes) || remindTimes.length === 0) {
    return 'remind_times 至少包含一个时间';
  }

  for (const item of remindTimes) {
    const text = String(item || '').trim();
    if (!TIME_REGEX.test(text)) {
      return `提醒时间格式非法: ${text || '空值'}`;
    }
  }

  return null;
}

function validateCreatePlan(req, res, next) {
  const body = req.body || {};

  if (!body.medication_name || String(body.medication_name).trim() === '') {
    return fail(res, 400, 'medication_name 不能为空', null, 400);
  }

  if (!body.dosage || String(body.dosage).trim() === '') {
    return fail(res, 400, 'dosage 不能为空', null, 400);
  }

  if (!body.frequency || !VALID_FREQUENCIES.includes(String(body.frequency).trim())) {
    return fail(res, 400, 'frequency 枚举值非法', null, 400);
  }

  const remindTimesErr = validateRemindTimes(body.remind_times);
  if (remindTimesErr) {
    return fail(res, 400, remindTimesErr, null, 400);
  }

  if (!isValidDate(body.start_date)) {
    return fail(res, 400, 'start_date 日期格式非法', null, 400);
  }

  if (body.end_date !== undefined && body.end_date !== null && body.end_date !== '') {
    if (!isValidDate(body.end_date)) {
      return fail(res, 400, 'end_date 日期格式非法', null, 400);
    }

    if (new Date(body.end_date).getTime() < new Date(body.start_date).getTime()) {
      return fail(res, 400, 'end_date 不能早于 start_date', null, 400);
    }
  }

  return next();
}

function validateUpdatePlan(req, res, next) {
  const body = req.body || {};
  const allowedFields = [
    'medication_name',
    'dosage',
    'frequency',
    'remind_times',
    'start_date',
    'end_date',
    'remaining_quantity',
    'reminder_threshold',
    'is_active',
  ];

  const hasAnyField = allowedFields.some((field) => body[field] !== undefined);
  if (!hasAnyField) {
    return fail(res, 400, '至少提供一个可更新字段', null, 400);
  }

  if (body.frequency !== undefined && !VALID_FREQUENCIES.includes(String(body.frequency).trim())) {
    return fail(res, 400, 'frequency 枚举值非法', null, 400);
  }

  if (body.remind_times !== undefined) {
    const remindTimesErr = validateRemindTimes(body.remind_times);
    if (remindTimesErr) {
      return fail(res, 400, remindTimesErr, null, 400);
    }
  }

  if (body.start_date !== undefined && body.start_date !== null && body.start_date !== '') {
    if (!isValidDate(body.start_date)) {
      return fail(res, 400, 'start_date 日期格式非法', null, 400);
    }
  }

  if (body.end_date !== undefined && body.end_date !== null && body.end_date !== '') {
    if (!isValidDate(body.end_date)) {
      return fail(res, 400, 'end_date 日期格式非法', null, 400);
    }
  }

  if (
    body.start_date !== undefined &&
    body.end_date !== undefined &&
    body.start_date &&
    body.end_date &&
    new Date(body.end_date).getTime() < new Date(body.start_date).getTime()
  ) {
    return fail(res, 400, 'end_date 不能早于 start_date', null, 400);
  }

  return next();
}

module.exports = {
  validateCreatePlan,
  validateUpdatePlan,
};
