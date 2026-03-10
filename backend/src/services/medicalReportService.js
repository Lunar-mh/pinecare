'use strict';

const medicalApiService = require('./medicalApiService');
const medicalReportModel = require('../models/medicalReportModel');
const { logThirdPartyError } = require('../utils/thirdParty');

function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

function normalizePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(422, `${fieldName} must be a positive integer.`, 422);
  }
  return parsed;
}

function normalizeDate(dateText, fieldName) {
  if (!dateText) {
    return null;
  }

  const value = String(dateText).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createBizError(422, `${fieldName} must use YYYY-MM-DD format.`, 422);
  }

  return value;
}

function normalizePage(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function paginate(list, page, pageSize) {
  const total = list.length;
  const offset = (page - 1) * pageSize;

  return {
    list: list.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
  };
}

const medicalReportService = {
  async list(userId, filters = {}) {
    const userIdNum = normalizePositiveInt(userId, 'userId');
    const page = normalizePage(filters.page, 1);
    const pageSize = Math.min(normalizePage(filters.pageSize, 10), 100);
    const includePagination = filters.page !== undefined || filters.pageSize !== undefined;

    const normalizedFilters = {
      reportType: filters.reportType ? String(filters.reportType).trim() : null,
      startDate: normalizeDate(filters.startDate, 'startDate'),
      endDate: normalizeDate(filters.endDate, 'endDate'),
    };

    const localReports = await medicalReportModel.listByUserId(userIdNum, normalizedFilters);

    try {
      const remoteReports = await medicalApiService.fetchMedicalReports(
        userIdNum,
        normalizedFilters
      );
      await medicalReportModel.batchUpsert(userIdNum, remoteReports);
      const synced = await medicalReportModel.listByUserId(userIdNum, normalizedFilters);

      if (includePagination) {
        return {
          source: medicalApiService.getSourceTag(),
          ...paginate(synced, page, pageSize),
        };
      }

      return {
        source: medicalApiService.getSourceTag(),
        list: synced,
      };
    } catch (error) {
      logThirdPartyError('medical-report', error, {
        operation: 'listReports',
        userId: userIdNum,
      });

      if (localReports.length > 0) {
        if (includePagination) {
          return {
            source: 'cache',
            ...paginate(localReports, page, pageSize),
          };
        }

        return {
          source: 'cache',
          list: localReports,
        };
      }

      if (error && (typeof error.code === 'number' || typeof error.statusCode === 'number')) {
        throw error;
      }

      throw createBizError(503, 'Medical report service is temporarily unavailable.', 503);
    }
  },
};

module.exports = medicalReportService;
