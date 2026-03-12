'use strict';

const { pool, query } = require('../../config/database');
const { generateRecordHash } = require('../../utils/hashChain');

const ZERO_HASH = '0'.repeat(64);

function getCreditLevelByScore(creditScore) {
  const score = Math.max(0, Math.min(100, Number(creditScore) || 0));

  if (score >= 95) return 'angel';
  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  return 'new';
}

module.exports = {
  pool,
  query,
  generateRecordHash,
  ZERO_HASH,
  getCreditLevelByScore,
};
