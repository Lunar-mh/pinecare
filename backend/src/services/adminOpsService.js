'use strict';

const adminOpsModel = require('../models/adminOpsModel');
const AuditLogModel = require('../models/auditLog');
const timeBankModel = require('../models/timeBank');
const medicalApiService = require('./medicalApiService');
const ossService = require('./ossService');
const { DEMO_SCENARIOS, getDemoScenarioById } = require('../config/demoScenarios');
const { resolveMode, isProductionLive } = require('../config/runtimeMode');
const { getRecentThirdPartyErrors } = require('../utils/thirdParty');

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

function isSchemaMissingError(err) {
  if (!err) return false;
  return (
    err.code === 'ER_NO_SUCH_TABLE' ||
    err.code === 'ER_BAD_FIELD_ERROR' ||
    /doesn't exist/i.test(String(err.message || ''))
  );
}

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createBizError(400, `${fieldName} must be a positive integer.`, 400);
  }
  return parsed;
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createBizError(400, `${fieldName} is invalid.`, 400);
  }
  return date;
}

function toDateTimeText(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace('T', ' ').slice(0, 19);
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

function parseSensorData(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function resolveServiceMode(key) {
  return String(process.env[key] || 'auto')
    .trim()
    .toLowerCase();
}

function hasEnv(keys) {
  return keys.every((key) => Boolean(String(process.env[key] || '').trim()));
}

function hasOssLiveConfig() {
  return (
    hasEnv(['OSS_UPLOAD_API_URL', 'OSS_UPLOAD_TOKEN']) ||
    hasEnv(['OSS_ENDPOINT', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'])
  );
}

function resolveAiEffectiveMode() {
  const mode = resolveServiceMode('AI_CONSULT_MODE');
  if (mode === 'live') return 'live';
  if (mode === 'stub' || mode === 'mock') return 'stub';
  return isProductionLive() || hasEnv(['DASHSCOPE_API_KEY']) ? 'live' : 'stub';
}

function resolveVoiceEffectiveMode() {
  const mode = resolveServiceMode('VOICE_SERVICE_MODE');
  if (mode === 'live') return 'live';
  if (mode === 'stub' || mode === 'mock') return 'stub';
  return isProductionLive() || hasEnv(['DASHSCOPE_API_KEY']) ? 'live' : 'stub';
}

function buildIntegrationRows() {
  const productionLive = isProductionLive();
  const medicalSource = medicalApiService.getSourceTag();

  return [
    {
      key: 'ai_consult',
      configured: hasEnv(['DASHSCOPE_API_KEY']),
      mode: resolveServiceMode('AI_CONSULT_MODE'),
      effectiveMode: resolveAiEffectiveMode(),
      fallbackAllowed: !productionLive,
    },
    {
      key: 'voice',
      configured: hasEnv(['DASHSCOPE_API_KEY']),
      mode: resolveServiceMode('VOICE_SERVICE_MODE'),
      effectiveMode: resolveVoiceEffectiveMode(),
      fallbackAllowed: !productionLive,
    },
    {
      key: 'oss',
      configured: hasOssLiveConfig(),
      mode: resolveServiceMode('OSS_MODE'),
      effectiveMode: ossService.isLiveMode() ? 'live' : 'stub',
      fallbackAllowed: !productionLive,
    },
    {
      key: 'medical',
      configured: hasEnv(['MEDICAL_API_BASE_URL', 'MEDICAL_API_KEY']),
      mode: resolveServiceMode('MEDICAL_API_MODE'),
      effectiveMode: medicalSource === 'third_party_live' ? 'live' : 'stub',
      fallbackAllowed:
        !productionLive &&
        String(process.env.MEDICAL_API_ALLOW_STUB_FALLBACK || 'false').toLowerCase() === 'true',
      source: medicalSource,
      notes:
        medicalSource === 'third_party_live'
          ? 'Medical requests currently use the live upstream integration path.'
          : 'Medical requests currently use deterministic stub data for competition replay.',
    },
    {
      key: 'wechat_notify',
      configured: hasEnv(['WX_ACCESS_TOKEN']) && hasEnv(['WX_MSG_TEMPLATE_ID']),
      mode: productionLive ? 'live' : 'auto',
      effectiveMode:
        productionLive || String(process.env.WECHAT_NOTIFY_MOCK || '0').trim() !== '1'
          ? 'live'
          : 'stub',
      fallbackAllowed: !productionLive,
    },
  ].map((item) => ({
    ...item,
    runtimeMode: resolveMode(),
    configState: item.configured ? 'ready' : 'missing',
    healthy:
      item.effectiveMode === 'live' ? item.configured : item.fallbackAllowed || item.configured,
  }));
}

function formatSosNotificationSummary(summaryRows) {
  const summaryMap = {};

  summaryRows.forEach((row) => {
    const eventId = Number(row.sos_event_id);
    if (!summaryMap[eventId]) {
      summaryMap[eventId] = {
        wechat: { pending: 0, sent: 0, failed: 0 },
        sms: { pending: 0, sent: 0, failed: 0 },
        total: { pending: 0, sent: 0, failed: 0 },
      };
    }

    const pending = Number(row.pending_count) || 0;
    const sent = Number(row.sent_count) || 0;
    const failed = Number(row.failed_count) || 0;
    const channel = row.notify_type === 'wechat' ? 'wechat' : 'sms';

    summaryMap[eventId][channel] = { pending, sent, failed };
    summaryMap[eventId].total.pending += pending;
    summaryMap[eventId].total.sent += sent;
    summaryMap[eventId].total.failed += failed;
  });

  return summaryMap;
}

const adminOpsService = {
  async getHealthOverview(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listHealthOverview({ search, communityId }, { pageSize, offset }),
        adminOpsModel.countHealthOverview({ search, communityId }),
      ]);

      const list = rows.map((row) => {
        const bpSystolic = row.bp_systolic !== null ? Number(row.bp_systolic) : null;
        const bpDiastolic = row.bp_diastolic !== null ? Number(row.bp_diastolic) : null;
        const heartRate = row.heart_rate !== null ? Number(row.heart_rate) : null;
        const bloodSugar = row.blood_sugar !== null ? Number(row.blood_sugar) : null;

        return {
          userId: Number(row.user_id),
          nickname: row.nickname || `User${row.user_id}`,
          phone: row.phone || '',
          age: row.age === null || row.age === undefined ? null : Number(row.age),
          bloodPressure:
            bpSystolic !== null && bpDiastolic !== null ? `${bpSystolic}/${bpDiastolic}` : null,
          heartRate,
          bloodSugar,
          riskLevel: calcHealthRisk({ bpSystolic, bpDiastolic, heartRate, bloodSugar }),
          lastUpdate: toDateTimeText(row.last_update),
        };
      });

      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async getMedicationLogs(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();
    const startDate = query.startDate ? String(query.startDate).trim() : null;
    const endDate = query.endDate ? String(query.endDate).trim() : null;
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    const allowedStatus = ['', 'pending', 'taken', 'skipped', 'missed'];
    if (!allowedStatus.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    if (startDate && Number.isNaN(new Date(startDate).getTime())) {
      throw createBizError(400, 'startDate is invalid.', 400);
    }

    if (endDate && Number.isNaN(new Date(endDate).getTime())) {
      throw createBizError(400, 'endDate is invalid.', 400);
    }

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listMedicationLogs(
          {
            search,
            status,
            startDate,
            endDate,
            communityId,
          },
          { pageSize, offset }
        ),
        adminOpsModel.countMedicationLogs({ search, status, startDate, endDate, communityId }),
      ]);

      return {
        list: rows.map((row) => ({
          id: Number(row.id),
          userId: Number(row.user_id),
          nickname: row.nickname || `User${row.user_id}`,
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
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async updateMedicationLogStatus(logId, payload = {}) {
    const id = parsePositiveInt(logId, 'logId');
    const status = String(payload.status || '').trim();
    const communityId = payload.communityId
      ? parsePositiveInt(payload.communityId, 'communityId')
      : null;
    const allowed = ['pending', 'taken', 'skipped', 'missed'];

    if (!allowed.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

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
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listGpsCurrent({ search, communityId }, { pageSize, offset }),
        adminOpsModel.countGpsCurrent({ search, communityId }),
      ]);

      return {
        list: rows.map((row) => ({
          id: Number(row.id),
          userId: Number(row.user_id),
          nickname: row.nickname || `User${row.user_id}`,
          phone: row.phone || '',
          age: row.age === null || row.age === undefined ? null : Number(row.age),
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: row.accuracy !== null ? Number(row.accuracy) : null,
          locationType: row.location_type,
          updatedAt: toDateTimeText(row.created_at),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async getGpsTrail(query = {}) {
    const userId = parsePositiveInt(query.userId, 'userId');
    const startDate = parseDate(query.startDate, 'startDate');
    const endDate = parseDate(query.endDate, 'endDate');
    const limit = Math.min(Math.max(Number(query.limit) || 1000, 1), 5000);
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    if (endDate.getTime() < startDate.getTime()) {
      throw createBizError(400, 'endDate must be >= startDate.', 400);
    }

    try {
      const rows = await adminOpsModel.listGpsTrail(userId, {
        startDate,
        endDate,
        limit,
        communityId,
      });

      return {
        userId,
        total: rows.length,
        list: rows.map((row) => ({
          id: Number(row.id),
          userId: Number(row.user_id),
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: row.accuracy !== null ? Number(row.accuracy) : null,
          locationType: row.location_type,
          createdAt: toDateTimeText(row.created_at),
        })),
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          userId,
          total: 0,
          list: [],
        };
      }
      throw err;
    }
  },

  async getFamilyBindings(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listFamilyBindings({ search, status, communityId }, { pageSize, offset }),
        adminOpsModel.countFamilyBindings({ search, status, communityId }),
      ]);

      return {
        list: rows.map((row) => ({
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
            age:
              row.elder_age === null || row.elder_age === undefined ? null : Number(row.elder_age),
          },
          healthArchive: {
            id:
              row.health_archive_id === null || row.health_archive_id === undefined
                ? null
                : Number(row.health_archive_id),
            updatedAt: row.health_updated_at || null,
          },
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async getMedicalReports(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const reportType = String(query.reportType || '').trim();
    const startDate = query.startDate ? String(query.startDate).trim() : '';
    const endDate = query.endDate ? String(query.endDate).trim() : '';
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    if (startDate && Number.isNaN(new Date(startDate).getTime())) {
      throw createBizError(400, 'startDate is invalid.', 400);
    }
    if (endDate && Number.isNaN(new Date(endDate).getTime())) {
      throw createBizError(400, 'endDate is invalid.', 400);
    }

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listMedicalReports(
          {
            search,
            reportType,
            startDate: startDate || null,
            endDate: endDate || null,
            communityId,
          },
          { pageSize, offset }
        ),
        adminOpsModel.countMedicalReports({
          search,
          reportType,
          startDate: startDate || null,
          endDate: endDate || null,
          communityId,
        }),
      ]);

      return {
        source: 'admin',
        list: rows.map((row) => ({
          id: Number(row.id),
          userId: Number(row.user_id),
          userName: row.nickname || `User${row.user_id}`,
          userPhone: row.phone || '',
          reportNo: row.report_no,
          reportType: row.report_type,
          reportDate: row.report_date,
          reportUrl: row.report_url || null,
          reportData: row.report_data || null,
          syncStatus: row.sync_status,
          createdAt: row.created_at,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          source: 'admin',
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async getSosEvents(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();

    const allowedStatus = ['', 'triggered', 'confirmed', 'resolved', 'cancelled'];
    if (!allowedStatus.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listSosEvents({ search, status }, { pageSize, offset }),
        adminOpsModel.countSosEvents({ search, status }),
      ]);

      const eventIds = rows.map((item) => Number(item.id));
      const summaryRows = await adminOpsModel.summarizeSosNotifications(eventIds);
      const summaryMap = formatSosNotificationSummary(summaryRows);

      return {
        list: rows.map((item) => ({
          event_id: Number(item.id),
          user_id: Number(item.user_id),
          user_name: item.nickname || `User${item.user_id}`,
          user_phone: item.phone || '',
          event_status: item.event_status,
          trigger_type: item.trigger_type,
          latitude: item.latitude,
          longitude: item.longitude,
          address: item.address,
          created_at: item.created_at,
          confirmed_at: item.confirmed_at,
          resolved_at: item.resolved_at,
          cancelled_at: item.cancelled_at,
          notification_summary: summaryMap[item.id] || {
            wechat: { pending: 0, sent: 0, failed: 0 },
            sms: { pending: 0, sent: 0, failed: 0 },
            total: { pending: 0, sent: 0, failed: 0 },
          },
        })),
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            page_size: pageSize,
            total: 0,
            total_pages: 0,
          },
        };
      }
      throw err;
    }
  },

  async updateSosEventStatus(eventId, payload = {}) {
    const id = parsePositiveInt(eventId, 'eventId');
    const toStatus = String(payload.status || '').trim();
    const allowedTarget = ['confirmed', 'resolved', 'cancelled'];

    if (!allowedTarget.includes(toStatus)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    const current = await adminOpsModel.getSosEventById(id);
    if (!current) {
      throw createBizError(404, 'SOS event not found.', 404);
    }

    const fromStatus = String(current.event_status || '');
    const allowedFlow = {
      triggered: ['confirmed', 'cancelled'],
      confirmed: ['resolved'],
      resolved: [],
      cancelled: [],
    };

    if (!(allowedFlow[fromStatus] || []).includes(toStatus)) {
      throw createBizError(409, `Cannot transition from ${fromStatus} to ${toStatus}.`, 409);
    }

    const affected = await adminOpsModel.updateSosEventStatus(id, fromStatus, toStatus);
    if (!affected) {
      throw createBizError(409, 'SOS event status changed concurrently, please retry.', 409);
    }

    return {
      event_id: id,
      event_status: toStatus,
    };
  },

  async getFallEvents(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    const allowedStatus = ['', 'detecting', 'confirmed', 'cancelled', 'false_alarm'];
    if (!allowedStatus.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listFallEvents({ search, status, communityId }, { pageSize, offset }),
        adminOpsModel.countFallEvents({ search, status, communityId }),
      ]);

      return {
        list: rows.map((item) => ({
          id: Number(item.id),
          userId: Number(item.user_id),
          nickname: item.nickname || `User${item.user_id}`,
          phone: item.phone || '',
          status: item.status,
          sensorData: parseSensorData(item.sensor_data),
          sensitivity: item.sensitivity,
          detectedAt: item.detected_at,
          cancelledAt: item.cancelled_at,
          confirmedAt: item.confirmed_at,
          createdAt: item.created_at,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async getDrugInteractions(query = {}) {
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();
    const limit = Math.min(Math.max(Number(query.limit) || 500, 1), 1000);
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    const allowedStatus = ['', 'pending', 'acknowledged'];
    if (!allowedStatus.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    try {
      const rows = await adminOpsModel.listDrugInteractions(
        { search, status, communityId },
        { pageSize: limit, offset: 0 }
      );

      return rows.map((item) => ({
        id: Number(item.id),
        userId: Number(item.user_id),
        userName: item.nickname || `User${item.user_id}`,
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
      }));
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return [];
      }
      throw err;
    }
  },

  async updateDrugInteractionStatus(interactionId, payload = {}) {
    const id = parsePositiveInt(interactionId, 'interactionId');
    const status = String(payload.status || '').trim();
    const communityId = payload.communityId
      ? parsePositiveInt(payload.communityId, 'communityId')
      : null;
    const allowedStatus = ['pending', 'acknowledged'];

    if (!allowedStatus.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    const current = await adminOpsModel.getDrugInteractionById(id, communityId);
    if (!current) {
      throw createBizError(404, 'Drug interaction not found.', 404);
    }

    const affected = await adminOpsModel.updateDrugInteractionStatus(id, status);
    if (!affected) {
      throw createBizError(409, 'Drug interaction status update failed.', 409);
    }

    return {
      id,
      status,
    };
  },

  async getTimeBankServiceHistory(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 100);
    const offset = (page - 1) * pageSize;
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim();
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    const allowedStatus = ['', 'pending', 'confirmed', 'cancelled'];
    if (!allowedStatus.includes(status)) {
      throw createBizError(400, 'status is invalid.', 400);
    }

    try {
      const [rows, total] = await Promise.all([
        adminOpsModel.listTimeBankServiceHistory(
          { search, status, communityId },
          { pageSize, offset }
        ),
        adminOpsModel.countTimeBankServiceHistory({ search, status, communityId }),
      ]);

      return {
        list: rows.map((item) => ({
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
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async confirmTimeBankService(payload = {}) {
    const recordId = parsePositiveInt(payload.recordId, 'recordId');
    const action = String(payload.action || '').trim();
    const communityId = payload.communityId
      ? parsePositiveInt(payload.communityId, 'communityId')
      : null;
    if (!['confirm', 'cancel'].includes(action)) {
      throw createBizError(400, 'action is invalid.', 400);
    }

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
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    try {
      const rows = await adminOpsModel.listTimeBankExchangeHistory({ limit, communityId });
      return rows.map((item) => ({
        id: Number(item.id),
        userId: Number(item.user_id),
        exchangeType: item.exchange_type,
        itemName: item.item_name,
        coinsRequired: Number(item.coins_required),
        status: item.status,
        createdAt: item.created_at,
        completedAt: item.completed_at,
      }));
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return [];
      }
      throw err;
    }
  },

  async getTimeBankLeaderboard(query = {}) {
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500);
    const communityId = query.communityId
      ? parsePositiveInt(query.communityId, 'communityId')
      : null;

    try {
      const rows = await adminOpsModel.listTimeBankLeaderboard({ communityId, limit });
      return rows.map((item, index) => ({
        rank: index + 1,
        userId: Number(item.user_id),
        balance: Number(item.balance),
        totalEarned: Number(item.total_earned),
        creditScore: Number(item.credit_score),
        creditLevel: item.credit_level,
      }));
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return [];
      }
      throw err;
    }
  },

  async getIntegrationStatus() {
    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      items: buildIntegrationRows(),
      recentErrors: getRecentThirdPartyErrors(10),
      summary: {
        healthyCount: buildIntegrationRows().filter((item) => item.healthy).length,
        totalCount: buildIntegrationRows().length,
      },
    };
  },

  async getAuditLogs(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const filters = {
      userId: query.userId ? parsePositiveInt(query.userId, 'userId') : null,
      action: query.action ? String(query.action).trim() : '',
    };

    try {
      const [list, total] = await Promise.all([
        AuditLogModel.list(filters, { page, pageSize }),
        AuditLogModel.count(filters),
      ]);

      return {
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (err) {
      if (isSchemaMissingError(err)) {
        return {
          list: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }
      throw err;
    }
  },

  async getDemoScenarios() {
    return {
      runtimeMode: resolveMode(),
      generatedAt: new Date().toISOString(),
      scenarios: DEMO_SCENARIOS.map((scenario, index) => ({
        ...scenario,
        order: index + 1,
      })),
    };
  },

  async bootstrapDemoScenario(payload = {}, actor = null) {
    const scenarioId = String(payload.scenarioId || payload.id || '').trim();
    if (!scenarioId) {
      throw createBizError(400, 'scenarioId is required.', 400);
    }

    const scenario = getDemoScenarioById(scenarioId);
    if (!scenario) {
      throw createBizError(404, 'Demo scenario not found.', 404);
    }

    const bootstrapAt = new Date().toISOString();
    const replayLog = scenario.apiSequence.map((api, index) => ({
      step: index + 1,
      action: api,
      status: 'pending',
      note: scenario.checklist[index] || 'Ready for replay.',
    }));

    try {
      await AuditLogModel.create({
        userId: actor && actor.userId ? Number(actor.userId) : null,
        action: 'admin.demo.bootstrap',
        details: {
          scenarioId: scenario.id,
          runtimeMode: resolveMode(),
          bootstrapAt,
        },
      });
    } catch (err) {
      if (!isSchemaMissingError(err)) {
        throw err;
      }
    }

    return {
      scenarioId: scenario.id,
      title: scenario.title,
      runtimeMode: resolveMode(),
      bootstrapAt,
      status: 'ready',
      bootstrap: scenario.bootstrap,
      preparedData: scenario.bootstrap,
      modules: scenario.modules,
      apiSequence: scenario.apiSequence,
      checklist: scenario.checklist,
      replayLog,
      warnings: [
        isProductionLive()
          ? 'PRODUCTION_LIVE enabled. Stub fallback paths are restricted.'
          : 'Sandbox mode active. Demo fallback paths remain available.',
      ],
    };
  },
};

module.exports = adminOpsService;
