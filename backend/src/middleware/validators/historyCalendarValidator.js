'use strict';

const { fail } = require('../../utils/response');

function validateHistoryCalendarMonth(req, res, next) {
  const month = String((req.query && req.query.month) || '').trim();

  if (!month) {
    return fail(res, 400, 'month is required.', null, 400);
  }

  if (!/^(\d{4})-(0[1-9]|1[0-2])$/.test(month)) {
    return fail(res, 400, 'month must use YYYY-MM format.', null, 400);
  }

  req.query.month = month;
  return next();
}

module.exports = {
  validateHistoryCalendarMonth,
};
