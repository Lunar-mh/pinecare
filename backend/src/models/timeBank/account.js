'use strict';

const { pool, query, getCreditLevelByScore } = require('./shared');

module.exports = {
  async getOrCreateAccountByUserId(userId) {
    const uid = Number(userId);
    if (!uid) {
      throw new Error('userId 非法');

};
