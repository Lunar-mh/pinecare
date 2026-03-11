'use strict';

const { query } = require('../config/database');

/**
 * 兼容 query 返回结构（rows 或 [rows, fields]）
 * @param {any} result
 * @returns {any}
 */
function unwrapQueryResult(result) {
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

/**
 * 家属关系模型
 */
const familyRelationModel = {
  /**
   * 校验家属是否可访问老人数据
   * @param {number} caregiverId
   * @param {number} elderId
   * @returns {Promise<boolean>}
   */
  async checkRelation(caregiverId, elderId) {
    const result = await query(
      `SELECT id
       FROM family_bindings
       WHERE family_user_id = ?
         AND elder_user_id = ?
         AND binding_status = 'approved'
       LIMIT 1`,
      [caregiverId, elderId]
    );

    const rows = unwrapQueryResult(result);
    return Array.isArray(rows) && rows.length > 0;
  },
};

module.exports = familyRelationModel;
