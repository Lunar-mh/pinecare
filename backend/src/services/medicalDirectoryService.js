'use strict';

const medicalApiService = require('./medicalApiService');
const medicalDirectoryModel = require('../models/medicalDirectoryModel');

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

const medicalDirectoryService = {
  /**
   * 查询医院列表：优先本地缓存，缓存缺失时回源第三方并刷新
   * @returns {Promise<object>}
   */
  async getHospitals() {
    const cached = await medicalDirectoryModel.getHospitals();
    if (cached.length > 0) {
      return {
        source: 'cache',
        list: cached,
      };
    }

    const remote = await medicalApiService.fetchHospitals();
    await medicalDirectoryModel.refreshHospitals(remote);

    return {
      source: 'remote',
      list: remote,
    };
  },

  /**
   * 查询科室列表：优先缓存，必要时回源并刷新
   * @param {any} hospitalId
   * @returns {Promise<object>}
   */
  async getDepartments(hospitalId) {
    const hospitalIdNum = normalizePositiveInt(hospitalId, 'hospitalId');

    const cached = await medicalDirectoryModel.getDepartments(hospitalIdNum);
    if (cached.length > 0) {
      return {
        source: 'cache',
        list: cached,
      };
    }

    const remote = await medicalApiService.fetchDepartments(hospitalIdNum);
    await medicalDirectoryModel.refreshDepartments(hospitalIdNum, remote);

    return {
      source: 'remote',
      list: remote,
    };
  },

  /**
   * 查询医生列表：优先缓存，必要时回源并刷新
   * @param {any} departmentId
   * @returns {Promise<object>}
   */
  async getDoctors(departmentId) {
    const departmentIdNum = normalizePositiveInt(departmentId, 'departmentId');

    const cached = await medicalDirectoryModel.getDoctors(departmentIdNum);
    if (cached.length > 0) {
      return {
        source: 'cache',
        list: cached,
      };
    }

    const remote = await medicalApiService.fetchDoctors(departmentIdNum);
    await medicalDirectoryModel.refreshDoctors(departmentIdNum, remote);

    return {
      source: 'remote',
      list: remote,
    };
  },
};

module.exports = medicalDirectoryService;
