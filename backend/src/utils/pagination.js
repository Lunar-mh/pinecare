'use strict';

function normalizePagination(query = {}, options = {}) {
  const {
    defaultPage = 1,
    defaultPageSize = 10,
    maxPageSize = 100,
    pageKey = 'page',
    pageSizeKeys = ['pageSize', 'page_size'],
    includeOffset = true,
    includeLimit = false,
  } = options;

  const page = Math.max(Number(query[pageKey]) || defaultPage, 1);
  const pageSizeValue = pageSizeKeys.reduce((value, key) => {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
    return query[key];
  }, undefined);
  const pageSize = Math.min(Math.max(Number(pageSizeValue) || defaultPageSize, 1), maxPageSize);

  const result = { page, pageSize };
  if (includeOffset) {
    result.offset = (page - 1) * pageSize;
  }
  if (includeLimit) {
    result.limit = pageSize;
  }
  return result;
}

function buildPagination(page, pageSize, total, pageSizeKey = 'pageSize') {
  return {
    page,
    [pageSizeKey]: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

module.exports = {
  normalizePagination,
  buildPagination,
};
