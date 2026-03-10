'use strict';

const medicalApiService = require('./medicalApiService');
const medicalReportModel = require('../models/medicalReportModel');

function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

function normalizePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(422, `${fieldName} 必须为正整数`, 422);
  }
  return parsed;
}

function normalizeDate(dateText, fieldName) {
  if (!dateText) {
    return null;
  }

  const value = String(dateText).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createBizError(422, `${fieldName} 格式必须为 YYYY-MM-DD`, 422);
  }

  return value;
}

const medicalReportService = {
  /**
   * 查询并同步报告
   * 规则：优先返回同步后的本地结果；若第三方失败且本地有缓存则降级返回缓存。
   * @param {number} userId
   * @param {object} filters
   * @returns {Promise<object>}
   */
  async list(userId, filters = {}) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const normalizedFilters = {
      reportType: filters.reportType ? String(filters.reportType).trim() : null,
      startDate: normalizeDate(filters.startDate, 'startDate'),
      endDate: normalizeDate(filters.endDate, 'endDate'),
    };

    const localReports = await medicalReportModel.listByUserId(userIdNum, normalizedFilters);

    try {
      const remoteReports = await medicalApiService.fetchMedicalReports(userIdNum, normalizedFilters);
      await medicalReportModel.batchUpsert(userIdNum, remoteReports);
      const synced = await medicalReportModel.listByUserId(userIdNum, normalizedFilters);

      return {
        source: 'remote',
        list: synced,
      };
    } catch (error) {
      if (localReports.length > 0) {
        return {
          source: 'cache',
          list: localReports,
        };
      }

      throw createBizError(503, '报告服务暂不可用，请稍后重试', 503);
    }
  },
};

module.exports = medicalReportService;
