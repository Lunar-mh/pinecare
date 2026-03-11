'use strict';

const axios = require('axios');
const AuditLogModel = require('../models/auditLog');
const {
  createUpstreamError,
  isRetryableError,
  logThirdPartyError,
} = require('../utils/thirdParty');
const { isProductionLive } = require('../config/runtimeMode');
const { resolveIntegrationMode } = require('../config/integrationMode');

const API_TIMEOUT_MS = Number(process.env.MEDICAL_API_TIMEOUT_MS || 5000);
const MAX_RETRY = Math.max(0, Number(process.env.MEDICAL_API_MAX_RETRY || 2));
const CIRCUIT_BREAKER_THRESHOLD = Math.max(
  1,
  Number(process.env.MEDICAL_API_CIRCUIT_BREAKER_THRESHOLD || 3)
);
const CIRCUIT_BREAKER_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.MEDICAL_API_CIRCUIT_BREAKER_COOLDOWN_MS || 30000)
);

function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeList(data, fieldName) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[fieldName])) return data[fieldName];
  return [];
}

async function writeAudit(action, details) {
  try {
    await AuditLogModel.create({
      userId: null,
      action,
      details,
    });
  } catch (_err) {
    // Ignore audit failures to keep third-party integration path non-blocking.
  }
}

class MedicalApiService {
  constructor() {
    this.mode = String(process.env.MEDICAL_API_MODE || 'auto').toLowerCase();
    this.baseURL = process.env.MEDICAL_API_BASE_URL || '';
    this.apiKey = process.env.MEDICAL_API_KEY || '';
    this.allowStubFallback =
      String(process.env.MEDICAL_API_ALLOW_STUB_FALLBACK || 'false').toLowerCase() === 'true';

    this.client = axios.create({
      baseURL: this.baseURL || 'https://medical-api.example.com',
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        ...this.buildAuthHeaders(),
      },
    });

    this.failureCount = 0;
    this.circuitOpenedAt = 0;
  }

  buildAuthHeaders() {
    if (!this.apiKey) {
      return {};
    }

    const authMode = String(process.env.MEDICAL_API_AUTH_MODE || 'bearer')
      .trim()
      .toLowerCase();

    if (authMode === 'x-api-key') {
      return { 'X-API-Key': this.apiKey };
    }

    return { Authorization: `Bearer ${this.apiKey}` };
  }

  hasLiveConfig() {
    return Boolean(this.baseURL) && Boolean(this.apiKey);
  }

  getModeStrategy() {
    return resolveIntegrationMode({
      requestedMode: this.mode,
      liveConfigured: this.hasLiveConfig(),
    });
  }

  isLiveMode() {
    return this.getModeStrategy().effectiveMode === 'live';
  }

  getSourceTag() {
    return this.isLiveMode() ? 'third_party_live' : 'third_party_stub';
  }

  getModeTag() {
    return this.getModeStrategy().effectiveMode;
  }

  getCapabilityReport() {
    const strategy = this.getModeStrategy();
    const missingConfig = [];
    if (!String(this.baseURL || '').trim()) missingConfig.push('MEDICAL_API_BASE_URL');
    if (!String(this.apiKey || '').trim()) missingConfig.push('MEDICAL_API_KEY');

    return {
      source: this.getSourceTag(),
      mode: strategy.requestedMode,
      effectiveMode: strategy.effectiveMode,
      liveConfigured: strategy.liveConfigured,
      fallbackAllowed: strategy.fallbackAllowed && this.allowStubFallback,
      circuitOpen: this.isCircuitOpen(),
      missingConfig,
      runtimeMode: strategy.runtimeMode,
    };
  }

  toUpstreamError(err) {
    return createUpstreamError(err, {
      timeout: 'Third-party medical service timeout.',
      rateLimited: 'Third-party medical service rate limited.',
      unavailable: 'Third-party medical service unavailable.',
      failed: 'Third-party medical service request failed.',
    });
  }

  isCircuitOpen() {
    if (!this.circuitOpenedAt) {
      return false;
    }

    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
      this.failureCount = 0;
      this.circuitOpenedAt = 0;
      return false;
    }

    return true;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.circuitOpenedAt = 0;
  }

  recordFailure() {
    this.failureCount += 1;
    if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitOpenedAt = Date.now();
    }
  }

  createCircuitOpenError() {
    return createBizError(503, 'Medical API circuit breaker is open.', 503);
  }

  async requestWithRetry(operation, requestFactory) {
    if (this.isCircuitOpen()) {
      throw this.createCircuitOpenError();
    }

    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
      try {
        const response = await requestFactory(this.client);
        this.recordSuccess();
        return response;
      } catch (err) {
        lastError = err;
        this.recordFailure();
        logThirdPartyError('medical-api', err, { operation, attempt: attempt + 1 });

        if (!isRetryableError(err) || attempt >= MAX_RETRY) {
          const upstreamError = this.toUpstreamError(err);
          await writeAudit('medical.upstream.failure', {
            operation,
            mode: 'live',
            code: upstreamError.code,
            status_code: upstreamError.statusCode,
            message: upstreamError.message,
            attempt: attempt + 1,
          });
          throw upstreamError;
        }

        await sleep(100 * (attempt + 1));
      }
    }

    throw this.toUpstreamError(lastError);
  }

  async execute(operation, stubFactory, liveFactory) {
    const strategy = this.getModeStrategy();

    if (strategy.effectiveMode !== 'live') {
      if (!strategy.stubAllowed) {
        throw createBizError(503, 'Medical API stub mode is disabled in PRODUCTION_LIVE mode.', 503);
      }
      return stubFactory();
    }

    if (!this.hasLiveConfig()) {
      throw createBizError(503, 'Medical API live mode is missing configuration.', 503);
    }

    try {
      return await liveFactory();
    } catch (err) {
      if (this.allowStubFallback && strategy.fallbackAllowed) {
        logThirdPartyError('medical-api', err, {
          operation,
          fallback: 'stub',
        });
        await writeAudit('medical.upstream.fallback', {
          operation,
          mode: 'live',
          fallback: 'stub',
          source: this.getSourceTag(),
        });
        return stubFactory();
      }
      throw err;
    }
  }

  buildRequestOptions(requestId) {
    if (!requestId) {
      return {};
    }

    return {
      headers: {
        'X-Request-Id': String(requestId),
      },
    };
  }

  stubHospitals() {
    return [
      { id: 1001, name: 'Yinban First People Hospital', level: '3A', city: 'Shanghai' },
      { id: 1002, name: 'Yinban Integrated Medicine Hospital', level: '3', city: 'Shanghai' },
      { id: 1003, name: 'Yinban Rehabilitation Hospital', level: '2', city: 'Shanghai' },
    ];
  }

  stubDepartments(hospitalId) {
    return [
      { id: 2001, hospitalId, name: 'Cardiology' },
      { id: 2002, hospitalId, name: 'Endocrinology' },
      { id: 2003, hospitalId, name: 'Neurology' },
    ];
  }

  stubDoctors(departmentId) {
    return [
      { id: 3001, departmentId, name: 'Dr. Zhang', title: 'Chief Physician' },
      { id: 3002, departmentId, name: 'Dr. Li', title: 'Associate Chief Physician' },
      { id: 3003, departmentId, name: 'Dr. Wang', title: 'Attending Physician' },
    ];
  }

  async fetchHospitals() {
    return this.execute(
      'fetchHospitals',
      () => this.stubHospitals(),
      async () => {
        const response = await this.requestWithRetry('fetchHospitals', (client) =>
          client.get('/hospitals')
        );
        const list = normalizeList(response.data, 'hospitals');
        if (!list.length) throw createBizError(503, 'Empty hospitals response.', 503);
        return list;
      }
    );
  }

  async fetchDepartments(hospitalId) {
    return this.execute(
      'fetchDepartments',
      () => this.stubDepartments(hospitalId),
      async () => {
        const response = await this.requestWithRetry('fetchDepartments', (client) =>
          client.get(`/hospitals/${hospitalId}/departments`)
        );
        const list = normalizeList(response.data, 'departments');
        if (!list.length) throw createBizError(503, 'Empty departments response.', 503);
        return list;
      }
    );
  }

  async fetchDoctors(departmentId) {
    return this.execute(
      'fetchDoctors',
      () => this.stubDoctors(departmentId),
      async () => {
        const response = await this.requestWithRetry('fetchDoctors', (client) =>
          client.get(`/departments/${departmentId}/doctors`)
        );
        const list = normalizeList(response.data, 'doctors');
        if (!list.length) throw createBizError(503, 'Empty doctors response.', 503);
        return list;
      }
    );
  }

  async fetchDoctorDetail(doctorId) {
    return this.execute(
      'fetchDoctorDetail',
      () => {
        const doctors = this.stubDoctors(2001);
        return doctors.find((item) => Number(item.id) === Number(doctorId)) || null;
      },
      async () => {
        const response = await this.requestWithRetry('fetchDoctorDetail', (client) =>
          client.get(`/doctors/${doctorId}`)
        );
        const data = response.data || {};
        if (!data.id) {
          throw createBizError(404, 'Doctor not found.', 404);
        }
        return data;
      }
    );
  }

  async createConsultSession(payload) {
    const requestOptions = this.buildRequestOptions(payload.requestId);

    return this.execute(
      'createConsultSession',
      () => {
        const sessionId = `consult_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return {
          thirdPartySessionId: sessionId,
          sessionUrl: `https://consult.example.com/session/${sessionId}`,
          consultStatus: 'active',
          startedAt: new Date(),
          doctorId: Number(payload.doctorId),
        };
      },
      async () => {
        const response = await this.requestWithRetry('createConsultSession', (client) =>
          client.post('/consult/sessions', payload, requestOptions)
        );
        const data = response.data || {};
        if (!data.thirdPartySessionId || !data.sessionUrl) {
          throw createBizError(503, 'Invalid consult session response.', 503);
        }
        return {
          thirdPartySessionId: data.thirdPartySessionId,
          sessionUrl: data.sessionUrl,
          consultStatus: data.consultStatus || 'active',
          startedAt: data.startedAt || new Date(),
          doctorId: Number(data.doctorId || payload.doctorId),
        };
      }
    );
  }

  async createAppointment(payload) {
    const requestOptions = this.buildRequestOptions(payload.requestId);

    return this.execute(
      'createAppointment',
      () => ({
        thirdPartyAppointId: `appoint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        appointStatus: 'confirmed',
        hospitalId: Number(payload.hospitalId),
        doctorId: Number(payload.doctorId),
      }),
      async () => {
        const response = await this.requestWithRetry('createAppointment', (client) =>
          client.post('/appointments', payload, requestOptions)
        );
        const data = response.data || {};
        if (!data.thirdPartyAppointId) {
          throw createBizError(503, 'Invalid appointment response.', 503);
        }
        return {
          thirdPartyAppointId: data.thirdPartyAppointId,
          appointStatus: data.appointStatus || 'confirmed',
          hospitalId: Number(data.hospitalId || payload.hospitalId),
          doctorId: Number(data.doctorId || payload.doctorId),
        };
      }
    );
  }

  async cancelAppointment(payload = {}) {
    const thirdPartyAppointId = payload.thirdPartyAppointId
      ? String(payload.thirdPartyAppointId)
      : '';
    const requestOptions = this.buildRequestOptions(payload.requestId);

    return this.execute(
      'cancelAppointment',
      () => ({
        thirdPartyAppointId: thirdPartyAppointId || `cancel_${Date.now()}`,
        appointStatus: 'cancelled',
        cancelStatus: 'ok',
      }),
      async () => {
        const targetId = thirdPartyAppointId || String(payload.appointmentId || '').trim();
        if (!targetId) {
          throw createBizError(422, 'appointmentId is required for cancellation.', 422);
        }

        const response = await this.requestWithRetry('cancelAppointment', (client) =>
          client.post(
            `/appointments/${targetId}/cancel`,
            {
              reason: payload.reason || 'user_cancelled',
            },
            requestOptions
          )
        );

        const data = response.data || {};
        return {
          thirdPartyAppointId: data.thirdPartyAppointId || thirdPartyAppointId || targetId,
          appointStatus: data.appointStatus || 'cancelled',
          cancelStatus: data.cancelStatus || 'ok',
        };
      }
    );
  }

  async fetchMedicalReports(userId, filters = {}) {
    const requestOptions = this.buildRequestOptions(filters.requestId);

    return this.execute(
      'fetchMedicalReports',
      () => {
        const today = new Date().toISOString().slice(0, 10);
        const reports = [
          {
            reportNo: `RPT-${userId}-001`,
            reportType: 'Lab',
            reportDate: today,
            reportUrl: 'https://report.example.com/rpt-001.pdf',
            reportData: { item: 'CBC', summary: 'All metrics are within normal range.' },
            syncStatus: 'synced',
          },
          {
            reportNo: `RPT-${userId}-002`,
            reportType: 'Imaging',
            reportDate: today,
            reportUrl: 'https://report.example.com/rpt-002.pdf',
            reportData: { item: 'Chest CT', summary: 'No obvious abnormality found.' },
            syncStatus: 'synced',
          },
        ];

        if (filters.reportType) {
          return reports.filter((item) => item.reportType === filters.reportType);
        }
        return reports;
      },
      async () => {
        const response = await this.requestWithRetry('fetchMedicalReports', (client) =>
          client.get('/reports', {
            params: {
              userId,
              reportType: filters.reportType || undefined,
              startDate: filters.startDate || undefined,
              endDate: filters.endDate || undefined,
            },
            ...requestOptions,
          })
        );

        const list = normalizeList(response.data, 'reports');
        return list.map((item) => ({
          reportNo: item.reportNo,
          reportType: item.reportType,
          reportDate: item.reportDate,
          reportUrl: item.reportUrl,
          reportData: item.reportData || {},
          syncStatus: item.syncStatus || 'synced',
        }));
      }
    );
  }
}

module.exports = new MedicalApiService();

