'use strict';

function ok(data) {
  return { ok: true, data };
}

function failResult(message) {
  return { ok: false, message };
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function requireString(value, fieldName, options = {}) {
  if (isBlank(value)) {
    return failResult(`${fieldName} is required.`);
  }

  const normalized = String(value).trim();
  if (options.maxLength && normalized.length > options.maxLength) {
    return failResult(`${fieldName} length must be <= ${options.maxLength}.`);
  }

  return ok(normalized);
}

function optionalString(value, fieldName, options = {}) {
  if (isBlank(value)) {
    return ok(null);
  }

  return requireString(value, fieldName, options);
}

function parsePositiveInt(value, fieldName, options = {}) {
  if (isBlank(value)) {
    return options.required === false ? ok(null) : failResult(`${fieldName} is required.`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return failResult(`${fieldName} must be a positive integer.`);
  }

  return ok(parsed);
}

function parseNumberInRange(value, fieldName, min, max, options = {}) {
  if (isBlank(value)) {
    return options.required === false ? ok(null) : failResult(`${fieldName} is required.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return failResult(`${fieldName} must be in ${min}-${max}.`);
  }

  return ok(parsed);
}

function parseEnum(value, fieldName, allowedValues, options = {}) {
  if (isBlank(value)) {
    return options.required === false ? ok(null) : failResult(`${fieldName} is required.`);
  }

  const normalized = String(value).trim();
  if (!allowedValues.includes(normalized)) {
    return failResult(`${fieldName} must be one of ${allowedValues.join('/')}.`);
  }

  return ok(normalized);
}

function parseDateString(value, fieldName, options = {}) {
  if (isBlank(value)) {
    return options.required === false ? ok(null) : failResult(`${fieldName} is required.`);
  }

  const normalized = String(value).trim();
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return failResult(`${fieldName} must be a valid date string.`);
  }

  return ok(normalized);
}

function parseYmdDate(value, fieldName, options = {}) {
  if (isBlank(value)) {
    return options.required === false ? ok(null) : failResult(`${fieldName} is required.`);
  }

  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return failResult(`${fieldName} must use YYYY-MM-DD format.`);
  }

  return ok(normalized);
}

function parsePagination(query = {}, options = {}) {
  const fallbackPage = options.defaultPage || 1;
  const fallbackPageSize = options.defaultPageSize || 20;
  const maxPageSize = options.maxPageSize || 100;

  const pageResult = parsePositiveInt(query.page, 'page', { required: false });
  if (!pageResult.ok) {
    return pageResult;
  }

  const rawPageSize = query.pageSize !== undefined ? query.pageSize : query.page_size;
  const pageSizeResult = parsePositiveInt(rawPageSize, 'pageSize', { required: false });
  if (!pageSizeResult.ok) {
    return pageSizeResult;
  }

  const page = pageResult.data || fallbackPage;
  const pageSize = pageSizeResult.data || fallbackPageSize;
  if (pageSize > maxPageSize) {
    return failResult(`pageSize must be in 1-${maxPageSize}.`);
  }

  return ok({
    page,
    pageSize,
  });
}

module.exports = {
  optionalString,
  parseDateString,
  parseEnum,
  parseNumberInRange,
  parsePagination,
  parsePositiveInt,
  parseYmdDate,
  requireString,
};
