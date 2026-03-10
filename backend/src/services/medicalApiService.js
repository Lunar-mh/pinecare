'use strict';

const axios = require('axios');

const API_TIMEOUT_MS = 5000;
const MAX_RETRY = 2;

function createBizError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode || code;
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapAxiosError(err) {
  if (err && err.code === 'ECONNABORTED') {
    return createBizError(504, 'Third-party medical service timeout.', 504);
  }

  if (err && err.response && err.response.status === 429) {
    return createBizError(503, 'Third-party medical service rate limited.', 503);
  }

  if (err && err.response && err.response.status >= 500) {
    return createBizError(503, 'Third-party medical service unavailable.', 503);
  }

  return createBizError(503, 'Third-party medical service request failed.', 503);
}

function normalizeList(data, fieldName) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[fieldName])) return data[fieldName];
  return [];
}

class MedicalApiService {
  constructor() {
    this.mode = String(process.env.MEDICAL_API_MODE || 'stub').toLowerCase();
    this.client = axios.create({
      baseURL: process.env.MEDICAL_API_BASE_URL || 'https://medical-api.example.com',
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MEDICAL_API_KEY || 'mock_api_key'}`,
      },
    });
  }

  isLiveMode() {
    return this.mode === 'live';
  }

  getSourceTag() {
    return this.isLiveMode() ? 'third_party_live' : 'third_party_stub';
  }

  async requestWithRetry(requestFactory) {
    let lastError = null;

    for (let index = 0; index <= MAX_RETRY; index += 1) {
      try {
        return await requestFactory(this.client);
      } catch (err) {
        lastError = err;
        if (index < MAX_RETRY) {
          await sleep(100 * (index + 1));
        }
      }
    }

    throw mapAxiosError(lastError);
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
    if (!this.isLiveMode()) {
      return this.stubHospitals();
    }

    try {
      const response = await this.requestWithRetry((client) => client.get('/hospitals'));
      const list = normalizeList(response.data, 'hospitals');
      if (!list.length) throw createBizError(503, 'Empty hospitals response.', 503);
      return list;
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  async fetchDepartments(hospitalId) {
    if (!this.isLiveMode()) {
      return this.stubDepartments(hospitalId);
    }

    try {
      const response = await this.requestWithRetry((client) => client.get(`/hospitals/${hospitalId}/departments`));
      const list = normalizeList(response.data, 'departments');
      if (!list.length) throw createBizError(503, 'Empty departments response.', 503);
      return list;
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  async fetchDoctors(departmentId) {
    if (!this.isLiveMode()) {
      return this.stubDoctors(departmentId);
    }

    try {
      const response = await this.requestWithRetry((client) => client.get(`/departments/${departmentId}/doctors`));
      const list = normalizeList(response.data, 'doctors');
      if (!list.length) throw createBizError(503, 'Empty doctors response.', 503);
      return list;
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  async createConsultSession(payload) {
    if (!this.isLiveMode()) {
      const sessionId = `consult_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        thirdPartySessionId: sessionId,
        sessionUrl: `https://consult.example.com/session/${sessionId}`,
        consultStatus: 'active',
        startedAt: new Date(),
        doctorId: Number(payload.doctorId),
      };
    }

    try {
      const response = await this.requestWithRetry((client) => client.post('/consult/sessions', payload));
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
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  async createAppointment(payload) {
    if (!this.isLiveMode()) {
      return {
        thirdPartyAppointId: `appoint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        appointStatus: 'confirmed',
        hospitalId: Number(payload.hospitalId),
        doctorId: Number(payload.doctorId),
      };
    }

    try {
      const response = await this.requestWithRetry((client) => client.post('/appointments', payload));
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
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  async fetchMedicalReports(userId, filters = {}) {
    if (!this.isLiveMode()) {
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
    }

    try {
      const response = await this.requestWithRetry((client) =>
        client.get('/reports', {
          params: {
            userId,
            reportType: filters.reportType || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
          },
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
    } catch (err) {
      throw mapAxiosError(err);
    }
  }
}

module.exports = new MedicalApiService();
