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
    return createBizError(504, '第三方医疗服务超时，请稍后重试', 504);
  }

  if (err && err.response && err.response.status === 429) {
    return createBizError(503, '第三方医疗服务限流，请稍后重试', 503);
  }

  if (err && err.response && err.response.status >= 500) {
    return createBizError(503, '第三方医疗服务暂不可用，请稍后重试', 503);
  }

  return createBizError(503, '第三方医疗服务调用失败', 503);
}

class MedicalApiService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.MEDICAL_API_BASE_URL || 'https://medical-api.example.com',
      timeout: API_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MEDICAL_API_KEY || 'mock_api_key'}`,
      },
    });
  }

  /**
   * 预留的重试能力（当前为stub，不触发真实外部调用）
   * @param {Function} requestFactory
   * @returns {Promise<any>}
   */
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

  /**
   * 查询医院列表（stub）
   * @returns {Promise<Array<object>>}
   */
  async fetchHospitals() {
    try {
      await this.requestWithRetry(async () => ({ data: { ok: true } }));
      return [
        { id: 1001, name: '银伴市第一人民医院', level: '三级甲等', city: '上海' },
        { id: 1002, name: '银伴市中西医结合医院', level: '三级', city: '上海' },
        { id: 1003, name: '银伴市康复医院', level: '二级', city: '上海' },
      ];
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  /**
   * 查询科室列表（stub）
   * @param {number} hospitalId
   * @returns {Promise<Array<object>>}
   */
  async fetchDepartments(hospitalId) {
    try {
      await this.requestWithRetry(async () => ({ data: { ok: true } }));
      return [
        { id: 2001, hospitalId, name: '心内科' },
        { id: 2002, hospitalId, name: '内分泌科' },
        { id: 2003, hospitalId, name: '神经内科' },
      ];
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  /**
   * 查询医生列表（stub）
   * @param {number} departmentId
   * @returns {Promise<Array<object>>}
   */
  async fetchDoctors(departmentId) {
    try {
      await this.requestWithRetry(async () => ({ data: { ok: true } }));
      return [
        { id: 3001, departmentId, name: '张明', title: '主任医师' },
        { id: 3002, departmentId, name: '李静', title: '副主任医师' },
        { id: 3003, departmentId, name: '王强', title: '主治医师' },
      ];
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  /**
   * 创建在线问诊会话（stub）
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async createConsultSession(payload) {
    try {
      await this.requestWithRetry(async () => ({ data: { ok: true } }));
      const sessionId = `consult_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        thirdPartySessionId: sessionId,
        sessionUrl: `https://consult.example.com/session/${sessionId}`,
        consultStatus: 'active',
        startedAt: new Date(),
        doctorId: Number(payload.doctorId),
      };
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  /**
   * 创建预约挂号（stub）
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async createAppointment(payload) {
    try {
      await this.requestWithRetry(async () => ({ data: { ok: true } }));
      return {
        thirdPartyAppointId: `appoint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        appointStatus: 'confirmed',
        hospitalId: Number(payload.hospitalId),
        doctorId: Number(payload.doctorId),
      };
    } catch (err) {
      throw mapAxiosError(err);
    }
  }

  /**
   * 拉取检查报告（stub）
   * @param {number} userId
   * @param {object} filters
   * @returns {Promise<Array<object>>}
   */
  async fetchMedicalReports(userId, filters = {}) {
    try {
      await this.requestWithRetry(async () => ({ data: { ok: true } }));
      const today = new Date();
      const dateText = today.toISOString().slice(0, 10);

      const reports = [
        {
          reportNo: `RPT-${userId}-001`,
          reportType: '检验',
          reportDate: dateText,
          reportUrl: 'https://report.example.com/rpt-001.pdf',
          reportData: {
            item: '血常规',
            summary: '白细胞与血红蛋白在参考范围内',
          },
          syncStatus: 'synced',
        },
        {
          reportNo: `RPT-${userId}-002`,
          reportType: '检查',
          reportDate: dateText,
          reportUrl: 'https://report.example.com/rpt-002.pdf',
          reportData: {
            item: '胸部CT',
            summary: '未见明显异常',
          },
          syncStatus: 'synced',
        },
      ];

      if (filters.reportType) {
        return reports.filter((item) => item.reportType === filters.reportType);
      }

      return reports;
    } catch (err) {
      throw mapAxiosError(err);
    }
  }
}

module.exports = new MedicalApiService();
