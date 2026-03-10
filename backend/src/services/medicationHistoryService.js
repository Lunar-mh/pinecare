'use strict';

const medicationLogModel = require('../models/medicationLogModel');

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function parseMonth(month) {
  const text = String(month || '').trim();
  const regex = /^(\d{4})-(0[1-9]|1[0-2])$/;

  if (!regex.test(text)) {
    throw createBizError(400, 'month 格式必须为 YYYY-MM', 400);
  }

  const year = Number(text.slice(0, 4));
  const mon = Number(text.slice(5, 7));

  const start = new Date(year, mon - 1, 1, 0, 0, 0);
  const endExclusive = new Date(year, mon, 1, 0, 0, 0);

  return { text, start, endExclusive };
}

function formatDay(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const medicationHistoryService = {
  async getCalendar(userId, month) {
    const monthInfo = parseMonth(month);

    const summaryRows = await medicationLogModel.aggregateCalendarByMonth(
      userId,
      monthInfo.start,
      monthInfo.endExclusive
    );

    const mapped = {};
    summaryRows.forEach((item) => {
      mapped[formatDay(item.day)] = item;
    });

    const days = [];
    const cursor = new Date(monthInfo.start.getTime());

    while (cursor < monthInfo.endExclusive) {
      const dayText = formatDay(cursor);
      const row = mapped[dayText] || {
        taken_count: 0,
        missed_count: 0,
        skipped_count: 0,
        pending_count: 0,
        total_count: 0,
      };

      days.push({
        date: dayText,
        taken: Number(row.taken_count || 0),
        missed: Number(row.missed_count || 0),
        skipped: Number(row.skipped_count || 0),
        pending: Number(row.pending_count || 0),
        total: Number(row.total_count || 0),
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      month: monthInfo.text,
      days,
    };
  },
};

module.exports = medicationHistoryService;
