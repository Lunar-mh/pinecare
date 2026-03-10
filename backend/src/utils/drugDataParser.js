'use strict';

const MAX_DRUG_COUNT = 30;
const RISK_ORDER = ['X', 'D', 'C', 'B', 'A'];
const RISK_WEIGHT = {
  X: 5,
  D: 4,
  C: 3,
  B: 2,
  A: 1,
};

/**
 * 标准化药物名称
 * @param {string} name
 * @returns {string}
 */
function normalizeDrugName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .toLowerCase();
}

/**
 * 校验并标准化药物列表
 * @param {Array<string>} drugList
 * @returns {Array<string>}
 */
function normalizeDrugList(drugList) {
  if (!Array.isArray(drugList)) {
    const err = new Error('drugList 必须是数组');
    err.code = 422;
    err.statusCode = 422;
    throw err;
  }

  const uniqueMap = new Map();

  for (const item of drugList) {
    const rawName = String(item || '').trim();
    if (!rawName) continue;

    const normalized = normalizeDrugName(rawName);
    if (!normalized) continue;

    if (!uniqueMap.has(normalized)) {
      uniqueMap.set(normalized, rawName);
    }
  }

  const result = Array.from(uniqueMap.values());

  if (result.length < 2) {
    const err = new Error('至少需要提供两种不同药物');
    err.code = 422;
    err.statusCode = 422;
    throw err;
  }

  if (result.length > MAX_DRUG_COUNT) {
    const err = new Error(`药物数量不能超过 ${MAX_DRUG_COUNT} 种`);
    err.code = 422;
    err.statusCode = 422;
    throw err;
  }

  return result;
}

/**
 * 规范药物对顺序，确保同一药物对键一致
 * @param {string} drugA
 * @param {string} drugB
 * @returns {{drugA: string, drugB: string}}
 */
function normalizeDrugPair(drugA, drugB) {
  const a = String(drugA || '').trim();
  const b = String(drugB || '').trim();

  if (!a || !b) {
    const err = new Error('药物名称不能为空');
    err.code = 422;
    err.statusCode = 422;
    throw err;
  }

  const na = normalizeDrugName(a);
  const nb = normalizeDrugName(b);

  if (na <= nb) {
    return { drugA: a, drugB: b };
  }

  return { drugA: b, drugB: a };
}

/**
 * 风险级别比较函数（X 最高）
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareRiskLevel(left, right) {
  const l = RISK_WEIGHT[left] || 0;
  const r = RISK_WEIGHT[right] || 0;
  return r - l;
}

/**
 * 按风险级别降序排序
 * @param {Array<{level: string}>} list
 * @returns {Array}
 */
function sortByRiskLevel(list) {
  return [...list].sort((a, b) => compareRiskLevel(a.level, b.level));
}

module.exports = {
  MAX_DRUG_COUNT,
  RISK_ORDER,
  RISK_WEIGHT,
  normalizeDrugName,
  normalizeDrugList,
  normalizeDrugPair,
  compareRiskLevel,
  sortByRiskLevel,
};
