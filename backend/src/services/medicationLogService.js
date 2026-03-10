'use strict';

const medicationLogModel = require('../models/medicationLogModel');

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

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
};

module.exports = medicationLogService;
