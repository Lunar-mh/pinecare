'use strict';

const {
  buildEmptyPagedResult,
  buildPagination,
  createBizError,
  isSchemaMissingError,
  normalizePagination,
  parsePositiveInt,
} = require('../shared');

function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function getCommunityId(query = {}) {
  return query.communityId ? parsePositiveInt(query.communityId, 'communityId') : null;
}

function getSearch(query = {}) {
  return String(query.search || '').trim();
}

function getUserLabel(row, field = 'nickname') {
  return row[field] || `User${row.user_id}`;
}

function validateEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw createBizError(400, `${fieldName} is invalid.`, 400);
  }
}

function parseOptionalDateText(value, fieldName) {
  if (!value) return null;
  const text = String(value).trim();
  if (Number.isNaN(new Date(text).getTime())) {
    throw createBizError(400, `${fieldName} is invalid.`, 400);
  }
  return text;
}

async function withSchemaFallback(action, fallback) {
  try {
    return await action();
  } catch (err) {
    if (isSchemaMissingError(err)) {
      return typeof fallback === 'function' ? fallback(err) : fallback;
    }
    throw err;
  }
}

async function buildPagedQueryResult({
  query = {},
  loadRows,
  loadTotal,
  mapRow,
  onSchemaMissing = buildEmptyPagedResult,
}) {
  const { page, pageSize, offset } = normalizePagination(query);
  return withSchemaFallback(async () => {
    const [rows, total] = await Promise.all([
      loadRows({ page, pageSize, offset }),
      loadTotal({ page, pageSize, offset }),
    ]);

    return {
      list: rows.map(mapRow),
      pagination: buildPagination(page, pageSize, total),
    };
  }, () => onSchemaMissing(page, pageSize));
}

module.exports = {
  buildPagedQueryResult,
  getCommunityId,
  getSearch,
  getUserLabel,
  parseOptionalDateText,
  toNumberOrNull,
  validateEnum,
  withSchemaFallback,
};
