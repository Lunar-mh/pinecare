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

function normalizePage(value, fallback) {
  const parsed = Number(value || fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function rethrowAsServiceError(err, fallbackMessage) {
  if (err && (typeof err.code === 'number' || typeof err.statusCode === 'number')) {
    throw err;
  }
  throw createBizError(503, fallbackMessage, 503);
}

function filterDoctors(list, filters = {}) {
  let filtered = Array.isArray(list) ? list : [];

  if (filters.keyword) {
    const keyword = String(filters.keyword).trim().toLowerCase();
    filtered = filtered.filter((item) => {
      const text = `${item.name || ''} ${item.title || ''} ${item.specialty || ''}`.toLowerCase();
      return text.includes(keyword);
    });
  }

  if (filters.hospitalId) {
    filtered = filtered.filter((item) => Number(item.hospitalId) === Number(filters.hospitalId));
  }

  if (filters.departmentId) {
    filtered = filtered.filter(
      (item) => Number(item.departmentId) === Number(filters.departmentId)
    );
  }

  return filtered;
}

function paginate(list, page, pageSize) {
  const total = list.length;
  const offset = (page - 1) * pageSize;

  return {
    list: list.slice(offset, offset + pageSize),
    page,
    pageSize,
    total,
  };
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

  async getDoctors(query = {}) {
    const normalizedQuery = query && typeof query === 'object' ? query : { departmentId: query };
    const departmentIdNum = normalizePositiveInt(normalizedQuery.departmentId, 'departmentId');
    const page = normalizePage(normalizedQuery.page, 1);
    const pageSize = Math.min(normalizePage(normalizedQuery.pageSize, 10), 100);

    const cached = await medicalDirectoryModel.getDoctors(departmentIdNum);
    if (cached.length > 0) {
      const filtered = filterDoctors(cached, normalizedQuery);
      return {
        source: 'cache',
        ...paginate(filtered, page, pageSize),
      };
    }

    try {
      const remote = await medicalApiService.fetchDoctors(departmentIdNum);
      await medicalDirectoryModel.refreshDoctors(departmentIdNum, remote);
      const filtered = filterDoctors(remote, normalizedQuery);

      return {
        source: medicalApiService.getSourceTag(),
        ...paginate(filtered, page, pageSize),
      };
    } catch (err) {
      logThirdPartyError('medical-directory', err, {
        operation: 'getDoctors',
        departmentId: departmentIdNum,
      });
      rethrowAsServiceError(err, 'Medical doctors service is temporarily unavailable.');
    }
  },

  async getDoctorDetail(doctorId) {
    const doctorIdNum = normalizePositiveInt(doctorId, 'doctorId');

    const cached = await medicalDirectoryModel.findDoctorById(doctorIdNum);
    if (cached) {
      return {
        source: 'cache',
        doctor: cached,
      };
    }

    try {
      const remote = await medicalApiService.fetchDoctorDetail(doctorIdNum);
      if (!remote) {
        throw createBizError(404, 'Doctor not found.', 404);
      }

      await medicalDirectoryModel.upsertDoctor(remote);

      return {
        source: medicalApiService.getSourceTag(),
        doctor: remote,
      };
    } catch (err) {
      logThirdPartyError('medical-directory', err, {
        operation: 'getDoctorDetail',
        doctorId: doctorIdNum,
      });
      rethrowAsServiceError(err, 'Medical doctor detail service is temporarily unavailable.');
    }
  },
};

module.exports = medicalDirectoryService;
