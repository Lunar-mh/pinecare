'use strict';

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function isSchemaMissingError(err) {
  if (!err) return false;
  return (
    err.code === 'ER_NO_SUCH_TABLE' ||
    err.code === 'ER_BAD_FIELD_ERROR' ||
    /doesn't exist/i.test(String(err.message || ''))
  );
}

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(400, `${fieldName} must be a positive integer.`, 400);
  }
  return parsed;
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createBizError(400, `${fieldName} is invalid.`, 400);
  }
  return date;
}

function toDateTimeText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function parseSensorData(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function normalizePagination(query = {}, defaultPageSize = 10, maxPageSize = 100) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || defaultPageSize, 1), maxPageSize);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function buildPagination(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

function buildEmptyPagedResult(page, pageSize) {
  return {
    list: [],
    pagination: buildPagination(page, pageSize, 0),
  };
}

module.exports = {
  buildEmptyPagedResult,
  buildPagination,
  createBizError,
  isSchemaMissingError,
  normalizePagination,
  parseDate,
  parsePositiveInt,
  parseSensorData,
  toDateTimeText,
};
