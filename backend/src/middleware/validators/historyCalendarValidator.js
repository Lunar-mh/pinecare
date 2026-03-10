'use strict';

const { fail } = require('../../utils/response');

function validateHistoryCalendarMonth(req, res, next) {
  const month = String((req.query && req.query.month) || '').trim();

  if (!month) {
    return fail(res, 400, 'month 不能为空', null, 400);
  }

  if (!/^(\d{4})-(0[1-9]|1[0-2])$/.test(month)) {
    return fail(res, 400, 'month 格式必须为 YYYY-MM', null, 400);
  }

  return next();
}

module.exports = {
  validateHistoryCalendarMonth,
};
