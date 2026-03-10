'use strict';

const locationRecordModel = require('../models/locationRecordModel');

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 5000;

/**
 * 创建业务错误
 * @param {number} code
 * @param {string} message
 * @param {number} [statusCode]
 * @returns {Error}
 */
function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

/**
 * 校验并解析时间参数
 * @param {string} value
 * @param {string} field
 * @returns {Date}
 */
function parseDate(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createBizError(400, `${field} 格式非法`, 400);
  }
  return date;
}

const locationTrailService = {
  /**
   * 获取用户轨迹
   * @param {number} userId
   * @param {{startDate:string,endDate:string,limit?:string|number}} params
   * @returns {Promise<object>}
   */
  async getTrail(userId, params) {
    if (!params || !params.startDate || !params.endDate) {
      throw createBizError(400, 'startDate 和 endDate 必填', 400);
    }

    const startDate = parseDate(params.startDate, 'startDate');
    const endDate = parseDate(params.endDate, 'endDate');

    if (endDate.getTime() < startDate.getTime()) {
      throw createBizError(400, 'endDate 不能早于 startDate', 400);
    }

    const rawLimit = Number(params.limit || DEFAULT_LIMIT);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit)))
      : DEFAULT_LIMIT;

    const trail = await locationRecordModel.getByTimeRange(userId, startDate, endDate, limit);

    return {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      total: trail.length,
      list: trail,
    };
  },
};

module.exports = locationTrailService;
