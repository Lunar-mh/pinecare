'use strict';

const medicalApiService = require('./medicalApiService');
const medicalDirectoryModel = require('../models/medicalDirectoryModel');
const { createMedicalMeta } = require('./medicalMeta');
const publicMedicalDirectory = require('../data/publicMedicalDirectory');
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

function canUseLiveMedicalDirectory() {
  if (typeof medicalApiService.hasLiveConfig === 'function') {
    return medicalApiService.hasLiveConfig();
  }

  return (
    Boolean(String(process.env.MEDICAL_API_BASE_URL || '').trim()) &&
    Boolean(String(process.env.MEDICAL_API_KEY || '').trim())
  );
}

function withMeta(operation, payload, options = {}) {
  return {
    ...createMedicalMeta(medicalApiService, operation, options),
    ...payload,
  };
}

const medicalDirectoryService = {
  async getHospitals() {
    const cached = await medicalDirectoryModel.getHospitals();
    if (cached.length > 0) {
      return withMeta(
        'medical.directory.hospitals',
        { list: cached },
        { source: 'cache', reason: 'cache_hit' }
      );
    }

    if (canUseLiveMedicalDirectory()) {
      try {
        const remote = await medicalApiService.fetchHospitals();
        await medicalDirectoryModel.refreshHospitals(remote);
        return withMeta(
          'medical.directory.hospitals',
          { list: remote },
          { source: medicalApiService.getSourceTag(), reason: 'live_sync' }
        );
      } catch (err) {
        logThirdPartyError('medical-directory', err, { operation: 'getHospitals' });
      }
    }

    const publicList = publicMedicalDirectory.getHospitals();
    if (publicList.length > 0) {
      await medicalDirectoryModel.refreshHospitals(publicList);
      return withMeta(
        'medical.directory.hospitals',
        { list: publicList },
        {
          source: 'public_curated_dataset',
          fallbackUsed: true,
          reason: 'public_dataset_fallback',
          detail:
            'Using curated public hospital directory because live medical catalog is unavailable.',
        }
      );
    }

    throw createBizError(503, '医院服务暂时不可用。', 503);
  },

  async getDepartments(hospitalId) {
    const hospitalIdNum = normalizePositiveInt(hospitalId, 'hospitalId');

    const cached = await medicalDirectoryModel.getDepartments(hospitalIdNum);
    if (cached.length > 0) {
      return withMeta(
        'medical.directory.departments',
        { list: cached },
        { source: 'cache', reason: 'cache_hit' }
      );
    }

    if (canUseLiveMedicalDirectory()) {
      try {
        const remote = await medicalApiService.fetchDepartments(hospitalIdNum);
        await medicalDirectoryModel.refreshDepartments(hospitalIdNum, remote);
        return withMeta(
          'medical.directory.departments',
          { list: remote },
          { source: medicalApiService.getSourceTag(), reason: 'live_sync' }
        );
      } catch (err) {
        logThirdPartyError('medical-directory', err, {
          operation: 'getDepartments',
          hospitalId: hospitalIdNum,
        });
      }
    }

    const publicList = publicMedicalDirectory.getDepartments(hospitalIdNum);
    if (publicList.length > 0) {
      await medicalDirectoryModel.refreshDepartments(hospitalIdNum, publicList);
      return withMeta(
        'medical.directory.departments',
        { list: publicList },
        {
          source: 'public_curated_dataset',
          fallbackUsed: true,
          reason: 'public_dataset_fallback',
          detail: `Using curated public department catalog for hospital ${hospitalIdNum}.`,
        }
      );
    }

    throw createBizError(503, '科室服务暂时不可用。', 503);
  },

  async getDoctors(query = {}) {
    const normalizedQuery = query && typeof query === 'object' ? query : { departmentId: query };
    const departmentIdNum = normalizePositiveInt(normalizedQuery.departmentId, 'departmentId');
    const page = normalizePage(normalizedQuery.page, 1);
    const pageSize = Math.min(normalizePage(normalizedQuery.pageSize, 10), 100);

    const cached = await medicalDirectoryModel.getDoctors(departmentIdNum);
    if (cached.length > 0) {
      const filtered = filterDoctors(cached, normalizedQuery);
      return withMeta('medical.directory.doctors', paginate(filtered, page, pageSize), {
        source: 'cache',
        reason: 'cache_hit',
      });
    }

    if (canUseLiveMedicalDirectory()) {
      try {
        const remote = await medicalApiService.fetchDoctors(departmentIdNum);
        await medicalDirectoryModel.refreshDoctors(departmentIdNum, remote);
        const filtered = filterDoctors(remote, normalizedQuery);

        return withMeta('medical.directory.doctors', paginate(filtered, page, pageSize), {
          source: medicalApiService.getSourceTag(),
          reason: 'live_sync',
        });
      } catch (err) {
        logThirdPartyError('medical-directory', err, {
          operation: 'getDoctors',
          departmentId: departmentIdNum,
        });
      }
    }

    const publicDoctors = publicMedicalDirectory.getDoctors(departmentIdNum);
    const publicList = filterDoctors(publicDoctors, normalizedQuery);
    if (publicList.length > 0) {
      await medicalDirectoryModel.refreshDoctors(departmentIdNum, publicDoctors);
      return withMeta('medical.directory.doctors', paginate(publicList, page, pageSize), {
        source: 'public_curated_dataset',
        fallbackUsed: true,
        reason: 'public_dataset_fallback',
        detail: `Using curated public doctor directory for department ${departmentIdNum}.`,
      });
    }

    throw createBizError(503, '医生服务暂时不可用。', 503);
  },

  async getDoctorDetail(doctorId) {
    const doctorIdNum = normalizePositiveInt(doctorId, 'doctorId');

    const cached = await medicalDirectoryModel.findDoctorById(doctorIdNum);
    if (cached) {
      return withMeta(
        'medical.directory.doctor_detail',
        { doctor: cached },
        { source: 'cache', reason: 'cache_hit' }
      );
    }

    if (canUseLiveMedicalDirectory()) {
      try {
        const remote = await medicalApiService.fetchDoctorDetail(doctorIdNum);
        if (remote) {
          await medicalDirectoryModel.upsertDoctor(remote);
          return withMeta(
            'medical.directory.doctor_detail',
            { doctor: remote },
            { source: medicalApiService.getSourceTag(), reason: 'live_sync' }
          );
        }
      } catch (err) {
        logThirdPartyError('medical-directory', err, {
          operation: 'getDoctorDetail',
          doctorId: doctorIdNum,
        });
      }
    }

    const doctor = publicMedicalDirectory.getDoctorById(doctorIdNum);
    if (doctor) {
      await medicalDirectoryModel.upsertDoctor(doctor);
      return withMeta(
        'medical.directory.doctor_detail',
        { doctor },
        {
          source: 'public_curated_dataset',
          fallbackUsed: true,
          reason: 'public_dataset_fallback',
          detail: `Using curated public doctor detail for doctor ${doctorIdNum}.`,
        }
      );
    }

    throw createBizError(404, '医生不存在。', 404);
  },
};

module.exports = medicalDirectoryService;
