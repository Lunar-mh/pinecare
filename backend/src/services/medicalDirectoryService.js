'use strict';

const medicalApiService = require('./medicalApiService');
const medicalDirectoryModel = require('../models/medicalDirectoryModel');
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

function rethrowAsServiceError(err, fallbackMessage) {
  if (err && (typeof err.code === 'number' || typeof err.statusCode === 'number')) {
    throw err;
  }
  throw createBizError(503, fallbackMessage, 503);
}

const medicalDirectoryService = {
  async getHospitals() {
    const cached = await medicalDirectoryModel.getHospitals();
    if (cached.length > 0) {
      return {
        source: 'cache',
        list: cached,
      };
    }

    try {
      const remote = await medicalApiService.fetchHospitals();
      await medicalDirectoryModel.refreshHospitals(remote);
      return {
        source: medicalApiService.getSourceTag(),
        list: remote,
      };
    } catch (err) {
      logThirdPartyError('medical-directory', err, { operation: 'getHospitals' });
      rethrowAsServiceError(err, 'Medical hospitals service is temporarily unavailable.');
    }
  },

  async getDepartments(hospitalId) {
    const hospitalIdNum = normalizePositiveInt(hospitalId, 'hospitalId');

    const cached = await medicalDirectoryModel.getDepartments(hospitalIdNum);
    if (cached.length > 0) {
      return {
        source: 'cache',
        list: cached,
      };
    }

    try {
      const remote = await medicalApiService.fetchDepartments(hospitalIdNum);
      await medicalDirectoryModel.refreshDepartments(hospitalIdNum, remote);
      return {
        source: medicalApiService.getSourceTag(),
        list: remote,
      };
    } catch (err) {
      logThirdPartyError('medical-directory', err, {
        operation: 'getDepartments',
        hospitalId: hospitalIdNum,
      });
      rethrowAsServiceError(err, 'Medical departments service is temporarily unavailable.');
    }
  },

  async getDoctors(departmentId) {
    const departmentIdNum = normalizePositiveInt(departmentId, 'departmentId');

    const cached = await medicalDirectoryModel.getDoctors(departmentIdNum);
    if (cached.length > 0) {
      return {
        source: 'cache',
        list: cached,
      };
    }

    try {
      const remote = await medicalApiService.fetchDoctors(departmentIdNum);
      await medicalDirectoryModel.refreshDoctors(departmentIdNum, remote);
      return {
        source: medicalApiService.getSourceTag(),
        list: remote,
      };
    } catch (err) {
      logThirdPartyError('medical-directory', err, {
        operation: 'getDoctors',
        departmentId: departmentIdNum,
      });
      rethrowAsServiceError(err, 'Medical doctors service is temporarily unavailable.');
    }
  },
};

module.exports = medicalDirectoryService;
