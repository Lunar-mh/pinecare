'use strict';

const adminOpsModel = require('../../models/adminOpsModel');
const {
  buildEmptyPagedResult,
  buildPagination,
  createBizError,
  isSchemaMissingError,
  parseDate,
  parsePositiveInt,
  toDateTimeText,
} = require('./shared');
const {
  buildPagedQueryResult,
  getCommunityId,
  getSearch,
  parseOptionalDateText,
  validateEnum,
  withSchemaFallback,
} = require('./adminCareOverview/common');
const {
  mapDrugInteractionRow,
  mapFallEventRow,
  mapFamilyBindingRow,
  mapGpsCurrentRow,
  mapGpsTrailRow,
  mapHealthOverviewRow,
  mapLeaderboardRow,
  mapMedicationLogRow,
  mapMedicalReportRow,
  mapTimeBankExchangeRow,
  mapTimeBankHistoryRow,
} = require('./adminCareOverview/mappers');

const adminCareOverviewService = {
  async getHealthOverview(query = {}) {
    const search = getSearch(query);
    const communityId = getCommunityId(query);

    return buildPagedQueryResult({
      query,
      loadRows: ({ pageSize, offset }) =>
        adminOpsModel.listHealthOverview({ search, communityId }, { pageSize, offset }),
      loadTotal: () => adminOpsModel.countHealthOverview({ search, communityId }),
      mapRow: mapHealthOverviewRow,
      onSchemaMissing: buildEmptyPagedResult,
    });
  },

  async getMedicationLogs(query = {}) {
    const search = getSearch(query);
    const status = String(query.status || '').trim();
    const startDate = parseOptionalDateText(query.startDate, 'startDate');
    const endDate = parseOptionalDateText(query.endDate, 'endDate');
    const communityId = getCommunityId(query);

    validateEnum(status, 'status', ['', 'pending', 'taken', 'skipped', 'missed']);

    return buildPagedQueryResult({
      query,
      loadRows: ({ pageSize, offset }) =>
        adminOpsModel.listMedicationLogs(
          { search, status, startDate, endDate, communityId },
          { pageSize, offset }
        ),
      loadTotal: () =>
        adminOpsModel.countMedicationLogs({ search, status, startDate, endDate, communityId }),
      mapRow: mapMedicationLogRow,
      onSchemaMissing: buildEmptyPagedResult,
    });
  },

  async updateMedicationLogStatus(logId, payload = {}) {
    const id = parsePositiveInt(logId, 'logId');
    const status = String(payload.status || '').trim();
    const communityId = payload.communityId ? parsePositiveInt(payload.communityId, 'communityId') : null;

    validateEnum(status, 'status', ['pending', 'taken', 'skipped', 'missed']);

    try {
      const current = await adminOpsModel.getMedicationLogById(id, communityId);
      if (!current) {
        throw createBizError(404, 'Medication log not found.', 404);
      }

      const affected = await adminOpsModel.updateMedicationLogStatus(id, status);
      if (!affected) {
        throw createBizError(404, 'Medication log not found.', 404);
      }

      const latest = await adminOpsModel.getMedicationLogById(id, communityId);
      return {
        id: Number(latest.id),
        status: latest.status,
        actualTime: toDateTimeText(latest.actual_time),
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        throw createBizError(503, 'Medication tables are unavailable.', 503);
      }
      throw err;
    }
  },

  async getGpsCurrent(query = {}) {
    const search = getSearch(query);
    const communityId = getCommunityId(query);

    return buildPagedQueryResult({
      query,
      loadRows: ({ pageSize, offset }) =>
        adminOpsModel.listGpsCurrent({ search, communityId }, { pageSize, offset }),
      loadTotal: () => adminOpsModel.countGpsCurrent({ search, communityId }),
      mapRow: mapGpsCurrentRow,
      onSchemaMissing: buildEmptyPagedResult,
    });
  },

  async getGpsTrail(query = {}) {
    const userId = parsePositiveInt(query.userId, 'userId');
    const startDate = parseDate(query.startDate, 'startDate');
    const endDate = parseDate(query.endDate, 'endDate');
    const limit = Math.min(Math.max(Number(query.limit) || 1000, 1), 5000);
    const communityId = getCommunityId(query);

    if (endDate.getTime() < startDate.getTime()) {
      throw createBizError(400, 'endDate must be >= startDate.', 400);
    }

    return withSchemaFallback(async () => {
      const rows = await adminOpsModel.listGpsTrail(userId, {
        startDate,
        endDate,
        limit,
        communityId,
      });

      return {
        userId,
        total: rows.length,
        list: rows.map(mapGpsTrailRow),
      };
    }, () => ({ userId, total: 0, list: [] }));
  },

  async getFamilyBindings(query = {}) {
    const search = getSearch(query);
    const status = String(query.status || '').trim();
    const communityId = getCommunityId(query);

    return buildPagedQueryResult({
      query,
      loadRows: ({ pageSize, offset }) =>
        adminOpsModel.listFamilyBindings({ search, status, communityId }, { pageSize, offset }),
      loadTotal: () => adminOpsModel.countFamilyBindings({ search, status, communityId }),
      mapRow: mapFamilyBindingRow,
      onSchemaMissing: buildEmptyPagedResult,
    });
  },

  async getMedicalReports(query = {}) {
    const search = getSearch(query);
    const reportType = String(query.reportType || '').trim();
    const startDate = parseOptionalDateText(query.startDate, 'startDate');
    const endDate = parseOptionalDateText(query.endDate, 'endDate');
    const communityId = getCommunityId(query);

    return buildPagedQueryResult({
      query,
      loadRows: ({ pageSize, offset }) =>
        adminOpsModel.listMedicalReports(
          { search, reportType, startDate, endDate, communityId },
          { pageSize, offset }
        ),
      loadTotal: () =>
        adminOpsModel.countMedicalReports({ search, reportType, startDate, endDate, communityId }),
      mapRow: mapMedicalReportRow,
      onSchemaMissing: (page, pageSize) => ({
        source: 'admin',
        list: [],
        pagination: buildPagination(page, pageSize, 0),
      }),
    }).then((result) => ({ ...result, source: 'admin' }));
  },

  async getFallEvents(query = {}) {
    const search = getSearch(query);
    const status = String(query.status || '').trim();
    const communityId = getCommunityId(query);

    validateEnum(status, 'status', ['', 'detecting', 'confirmed', 'cancelled', 'false_alarm']);

    return buildPagedQueryResult({
      query,
      loadRows: ({ pageSize, offset }) =>
        adminOpsModel.listFallEvents({ search, status, communityId }, { pageSize, offset }),
      loadTotal: () => adminOpsModel.countFallEvents({ search, status, communityId }),
      mapRow: mapFallEventRow,
      onSchemaMissing: buildEmptyPagedResult,
    });
  },

  async getDrugInteractions(query = {}) {
    const search = getSearch(query);
    const status = String(query.status || '').trim();
    const limit = Math.min(Math.max(Number(query.limit) || 500, 1), 1000);
    const communityId = getCommunityId(query);

    validateEnum(status, 'status', ['', 'pending', 'acknowledged']);

    return withSchemaFallback(async () => {
      const rows = await adminOpsModel.listDrugInteractions(
        { search, status, communityId },
        { pageSize: limit, offset: 0 }
      );
      return rows.map(mapDrugInteractionRow);
    }, []);
  },

  async updateDrugInteractionStatus(interactionId, payload = {}) {
    const id = parsePositiveInt(interactionId, 'interactionId');
    const status = String(payload.status || '').trim();
    const communityId = payload.communityId ? parsePositiveInt(payload.communityId, 'communityId') : null;

    validateEnum(status, 'status', ['pending', 'acknowledged']);

    const current = await adminOpsModel.getDrugInteractionById(id, communityId);
    if (!current) {
      throw createBizError(404, 'Drug interaction not found.', 404);
    }

    const affected = await adminOpsModel.updateDrugInteractionStatus(id, status);
    if (!affected) {
      throw createBizError(409, 'Drug interaction status update failed.', 409);
    }

    return { id, status };
  },

  async getTimeBankServiceHistory(query = {}) {
    const search = getSearch(query);
    const status = String(query.status || '').trim();
    const communityId = getCommunityId(query);

    validateEnum(status, 'status', ['', 'pending', 'confirmed', 'cancelled']);

    return buildPagedQueryResult({
      query,
      loadRows: ({ pageSize, offset }) =>
        adminOpsModel.listTimeBankServiceHistory({ search, status, communityId }, { pageSize, offset }),
      loadTotal: () => adminOpsModel.countTimeBankServiceHistory({ search, status, communityId }),
      mapRow: mapTimeBankHistoryRow,
      onSchemaMissing: buildEmptyPagedResult,
    });
  },

  async confirmTimeBankService(payload = {}) {
    const recordId = parsePositiveInt(payload.recordId, 'recordId');
    const action = String(payload.action || '').trim();
    const communityId = payload.communityId ? parsePositiveInt(payload.communityId, 'communityId') : null;

    validateEnum(action, 'action', ['confirm', 'cancel']);

    const existing = await adminOpsModel.getTimeBankServiceRecordById(recordId, communityId);
    if (!existing) {
      throw createBizError(404, 'Service record not found.', 404);
    }
    if (existing.status !== 'pending') {
      throw createBizError(409, 'Only pending records can be settled.', 409);
    }

    await adminOpsModel.settleServiceRecord(recordId, action);
    return {
      recordId,
      status: action === 'confirm' ? 'confirmed' : 'cancelled',
    };
  },

  async getTimeBankExchangeHistory(query = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 200, 1), 1000);
    const communityId = getCommunityId(query);

    return withSchemaFallback(async () => {
      const rows = await adminOpsModel.listTimeBankExchangeHistory({ limit, communityId });
      return rows.map(mapTimeBankExchangeRow);
    }, []);
  },

  async getTimeBankLeaderboard(query = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
    const communityId = getCommunityId(query);

    return withSchemaFallback(async () => {
      const rows = await adminOpsModel.listTimeBankLeaderboard({ communityId, limit });
      return rows.map(mapLeaderboardRow);
    }, []);
  },
};

module.exports = adminCareOverviewService;
