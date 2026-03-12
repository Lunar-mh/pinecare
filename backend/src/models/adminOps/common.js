'use strict';

const { query } = require('../../config/database');

function buildUserSearchWhere(search, tableAlias = 'u') {
  const text = String(search || '').trim();
  if (!text) {
    return { whereSql: '', values: [] };
  }

  const keyword = `%${text}%`;
  return {
    whereSql: `WHERE (${tableAlias}.nickname LIKE ? OR ${tableAlias}.phone LIKE ? OR CAST(${tableAlias}.id AS CHAR) LIKE ?)`,
    values: [keyword, keyword, keyword],
  };
}

function buildWhereSql(whereList) {
  return whereList.length > 0 ? `WHERE ${whereList.join(' AND ')}` : '';
}

let familyBindingColumnsCache = null;
let familyBindingColumnsPromise = null;

async function resolveFamilyBindingColumns() {
  if (familyBindingColumnsCache) {
    return familyBindingColumnsCache;
  }

  if (familyBindingColumnsPromise) {
    return familyBindingColumnsPromise;
  }

  familyBindingColumnsPromise = (async () => {
    const [rows] = await query('SHOW COLUMNS FROM family_bindings');
    const columns = new Set((Array.isArray(rows) ? rows : []).map((item) => String(item.Field || '')));

    familyBindingColumnsCache = {
      elderColumn: columns.has('elder_id') ? 'elder_id' : 'user_id',
      familyColumn: columns.has('family_id') ? 'family_id' : 'family_user_id',
      statusColumn: columns.has('status') ? 'status' : columns.has('binding_status') ? 'binding_status' : 'status',
    };

    return familyBindingColumnsCache;
  })();

  try {
    return await familyBindingColumnsPromise;
  } finally {
    familyBindingColumnsPromise = null;
  }
}

module.exports = {
  query,
  buildUserSearchWhere,
  buildWhereSql,
  resolveFamilyBindingColumns,
};
