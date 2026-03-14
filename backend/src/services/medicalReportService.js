'use strict';

const medicalApiService = require('./medicalApiService');
const medicalReportModel = require('../models/medicalReportModel');
const { createMedicalMeta } = require('./medicalMeta');
const { logThirdPartyError } = require('../utils/thirdParty');
const { createBizError } = require('../utils/serviceError');


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

function withMeta(operation, payload, options = {}) {
  return {
    ...createMedicalMeta(medicalApiService, operation, options),
    ...payload,
  };
}

function buildSampleReports(userId, filters = {}) {
  const sampleList = [
    {
      reportNo: `LAB-${userId}-20260301`,
      reportType: 'Lab',
      reportDate: '2026-03-01',
      reportUrl: null,
      reportData: {
        item: 'Blood routine',
        summary: 'Hemoglobin and leukocyte indicators remain in acceptable range.',
      },
      syncStatus: 'synced',
    },
    {
      reportNo: `IMG-${userId}-20260305`,
      reportType: 'Imaging',
      reportDate: '2026-03-05',
      reportUrl: null,
      reportData: {
        item: 'Chest CT',
        summary: 'No progressive abnormal imaging findings were observed.',
      },
      syncStatus: 'synced',
    },
  ];

  return sampleList.filter((item) => {
    if (filters.reportType && item.reportType !== filters.reportType) {
      return false;
    }
    if (filters.startDate && item.reportDate < filters.startDate) {
      return false;
    }
    if (filters.endDate && item.reportDate > filters.endDate) {
      return false;
    }
    return true;
  });
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
      const payload = includePagination ? paginate(synced, page, pageSize) : { list: synced };

      return withMeta('medical.reports.list', payload, {
        source:
          typeof medicalApiService.getSourceTag === 'function'
            ? medicalApiService.getSourceTag()
            : 'third_party_stub',
        reason: 'report_sync_complete',
        detail: 'Medical reports were synchronized from upstream and refreshed in local cache.',
        receipt: {
          reportCount: synced.length,
        },
      });
    } catch (error) {
      logThirdPartyError('medical-report', error, {
        operation: 'listReports',
        userId: userIdNum,
      });

      if (localReports.length > 0) {
        const payload = includePagination
          ? paginate(localReports, page, pageSize)
          : { list: localReports };
        return withMeta('medical.reports.list', payload, {
          source: 'cache',
          fallbackUsed: true,
          reason: 'local_cache_fallback',
          detail: 'Serving medical reports from local cache because upstream sync failed.',
        });
      }

      const sampleReports = buildSampleReports(userIdNum, normalizedFilters);
      if (sampleReports.length > 0) {
        const payload = includePagination
          ? paginate(sampleReports, page, pageSize)
          : { list: sampleReports };
        return withMeta('medical.reports.list', payload, {
          source: 'competition_dataset_sample',
          fallbackUsed: true,
          reason: 'sample_report_fallback',
          detail:
            'Using curated competition report samples because upstream medical sync is unavailable.',
        });
      }

      if (error && (typeof error.code === 'number' || typeof error.statusCode === 'number')) {
        throw error;
      }

      throw createBizError(503, 'Medical report service is temporarily unavailable.', 503);
    }
  },
};

module.exports = medicalReportService;