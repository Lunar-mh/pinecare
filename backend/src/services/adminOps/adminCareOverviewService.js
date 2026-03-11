'use strict';

const adminOpsModel = require('../../models/adminOpsModel');
const timeBankModel = require('../../models/timeBank');
const {
  buildEmptyPagedResult,
  buildPagination,
  createBizError,
  isSchemaMissingError,
  normalizePagination,
  parseDate,
  parsePositiveInt,
  parseSensorData,
  toDateTimeText,
} = require('./shared');

function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function getCommunityId(query = {}) {
  return query.communityId ? parsePositiveInt(query.communityId, 'communityId') : null;
}

function getSearch(query = {}) {
  return String(query.search || '').trim();
}

function getUserLabel(row, field = 'nickname') {
  return row[field] || `User${row.user_id}`;
}

function validateEnum(value, fieldName, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw createBizError(400, `${fieldName} is invalid.`, 400);
  }
}

function parseOptionalDateText(value, fieldName) {
  if (!value) return null;
  const text = String(value).trim();
  if (Number.isNaN(new Date(text).getTime())) {
    throw createBizError(400, `${fieldName} is invalid.`, 400);
  }
  return text;
}

async function withSchemaFallback(action, fallback) {
  try {
    return await action();
  } catch (err) {
    if (isSchemaMissingError(err)) {
      return typeof fallback === 'function' ? fallback(err) : fallback;
    }
    throw err;
  }
}

async function buildPagedQueryResult({
  query = {},
  loadRows,
  loadTotal,
  mapRow,
  onSchemaMissing,
}) {
  const { page, pageSize, offset } = normalizePagination(query);
  return withSchemaFallback(async () => {
    const [rows, total] = await Promise.all([
      loadRows({ page, pageSize, offset }),
      loadTotal({ page, pageSize, offset }),
    ]);

    return {
      list: rows.map(mapRow),
      pagination: buildPagination(page, pageSize, total),
    };
  }, () => onSchemaMissing(page, pageSize));
}

function calcHealthRisk({ bpSystolic, bpDiastolic, heartRate, bloodSugar }) {
  const sys = Number(bpSystolic);
  const dia = Number(bpDiastolic);
  const hr = Number(heartRate);
  const sugar = Number(bloodSugar);

  const danger =
    (Number.isFinite(sys) && sys >= 160) ||
    (Number.isFinite(dia) && dia >= 100) ||
    (Number.isFinite(hr) && (hr < 55 || hr > 110)) ||
    (Number.isFinite(sugar) && sugar >= 11);
  if (danger) return 'danger';

  const warning =
    (Number.isFinite(sys) && sys >= 140) ||
    (Number.isFinite(dia) && dia >= 90) ||
    (Number.isFinite(hr) && (hr < 60 || hr > 100)) ||
    (Number.isFinite(sugar) && sugar >= 7);
  return warning ? 'warning' : 'normal';
}

function mapHealthOverviewRow(row) {
  const bpSystolic = toNumberOrNull(row.bp_systolic);
  const bpDiastolic = toNumberOrNull(row.bp_diastolic);
  const heartRate = toNumberOrNull(row.heart_rate);
  const bloodSugar = toNumberOrNull(row.blood_sugar);

  return {
    userId: Number(row.user_id),
    nickname: getUserLabel(row),
    phone: row.phone || '',
    age: toNumberOrNull(row.age),
    bloodPressure:
      bpSystolic !== null && bpDiastolic !== null ? `${bpSystolic}/${bpDiastolic}` : null,
    heartRate,
    bloodSugar,
    riskLevel: calcHealthRisk({ bpSystolic, bpDiastolic, heartRate, bloodSugar }),
    lastUpdate: toDateTimeText(row.last_update),
  };
}

function mapMedicationLogRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    nickname: getUserLabel(row),
    phone: row.phone || '',
    planId: Number(row.plan_id),
    medicationName: row.medication_name || '-',
    dosage: row.dosage || '-',
    scheduledTime: toDateTimeText(row.scheduled_time),
    actualTime: toDateTimeText(row.actual_time),
    status: row.status,
    reminderSent: Number(row.reminder_sent || 0),
    secondReminderSent: Number(row.second_reminder_sent || 0),
    familyNotified: Number(row.family_notified || 0),
  };
}

function mapGpsCurrentRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    nickname: getUserLabel(row),
    phone: row.phone || '',
    age: toNumberOrNull(row.age),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: toNumberOrNull(row.accuracy),
    locationType: row.location_type,
    updatedAt: toDateTimeText(row.created_at),
  };
}

function mapGpsTrailRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: toNumberOrNull(row.accuracy),
    locationType: row.location_type,
    createdAt: toDateTimeText(row.created_at),
  };
}

function mapFamilyBindingRow(row) {
  return {
    bindingId: Number(row.id),
    elderId: Number(row.elder_id),
    familyId: Number(row.family_id),
    status: row.status,
    boundAt: row.binding_created_at,
    elderProfile: {
      nickname: row.elder_nickname || null,
      realName: row.elder_name || null,
      avatarUrl: row.elder_avatar || null,
      gender: row.elder_gender || null,
      age: toNumberOrNull(row.elder_age),
    },
    healthArchive: {
      id: toNumberOrNull(row.health_archive_id),
      updatedAt: row.health_updated_at || null,
    },
  };
}

function mapMedicalReportRow(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    userName: getUserLabel(row),
    userPhone: row.phone || '',
    reportNo: row.report_no,
    reportType: row.report_type,
    reportDate: row.report_date,
    reportUrl: row.report_url || null,
    reportData: row.report_data || null,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
  };
}

function mapFallEventRow(item) {
  return {
    id: Number(item.id),
    userId: Number(item.user_id),
    nickname: getUserLabel(item),
    phone: item.phone || '',
    status: item.status,
    sensorData: parseSensorData(item.sensor_data),
    sensitivity: item.sensitivity,
    detectedAt: item.detected_at,
    cancelledAt: item.cancelled_at,
    confirmedAt: item.confirmed_at,
    createdAt: item.created_at,
  };
}

function mapDrugInteractionRow(item) {
  return {
    id: Number(item.id),
    userId: Number(item.user_id),
    userName: getUserLabel(item),
    userPhone: item.phone || '',
    drugA: item.drug_a,
    drugB: item.drug_b,
    level: item.level,
    mechanism: item.mechanism || '',
    riskDescription: item.risk_description || '',
    suggestion: item.suggestion || '',
    status: item.status,
    checkBatchId: item.check_batch_id,
    createdAt: item.created_at,
  };
}

function mapTimeBankHistoryRow(item) {
  return {
    id: Number(item.id),
    providerId: Number(item.provider_id),
    providerName: item.provider_nickname || `User${item.provider_id}`,
    recipientId: Number(item.recipient_id),
    recipientName: item.recipient_nickname || `User${item.recipient_id}`,
    serviceType: item.service_type,
    startTime: item.start_time,
    endTime: item.end_time,
    durationHours: Number(item.duration_hours),
    timeCoins: Number(item.time_coins),
    status: item.status,
    createdAt: item.created_at,
  };
}

function mapTimeBankExchangeRow(item) {
  return {
    id: Number(item.id),
    userId: Number(item.user_id),
    exchangeType: item.exchange_type,
    itemName: item.item_name,
    coinsRequired: Number(item.coins_required),
    status: item.status,
    createdAt: item.created_at,
    completedAt: item.completed_at,
  };
}

function mapLeaderboardRow(item, index) {
  return {
    rank: index + 1,
    userId: Number(item.user_id),
    balance: Number(item.balance),
    totalEarned: Number(item.total_earned),
    creditScore: Number(item.credit_score),
    creditLevel: item.credit_level,
  };
}

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

    await timeBankModel.settleServiceRecord(recordId, action);
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

