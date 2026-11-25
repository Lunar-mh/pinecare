'use strict';

const adminOpsModel = require('../../models/adminOpsModel');
const {
  buildEmptyPagedResult,
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
  mapFallEventRow,
  mapFamilyBindingRow,
  mapGpsCurrentRow,
  mapGpsTrailRow,
  mapHealthOverviewRow,
  mapMedicationLogRow,
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
    const communityId = payload.communityId
      ? parsePositiveInt(payload.communityId, 'communityId')
      : null;

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

    return withSchemaFallback(
      async () => {
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
      },
      () => ({ userId, total: 0, list: [] })
    );
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
};

module.exports = adminCareOverviewService;
