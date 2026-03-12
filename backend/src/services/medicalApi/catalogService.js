'use strict';

const { createBizError, normalizeList } = require('./shared');
const { recordProviderSuccess } = require('../../utils/providerRuntime');
const {
  stubDepartments,
  stubDoctorDetail,
  stubDoctors,
  stubHospitals,
} = require('./stubData');

const catalogService = {
  fetchHospitals(service) {
    return service.execute(
      'fetchHospitals',
      () => stubHospitals(),
      async () => {
        const response = await service.requestWithRetry('fetchHospitals', (client) =>
          client.get('/hospitals')
        );
        const list = normalizeList(response.data, 'hospitals');
        if (!list.length) throw createBizError(503, 'Empty hospitals response.', 503);
        recordProviderSuccess('medical-api', {
          operation: 'fetch_hospitals',
          mode: 'live',
          total: list.length,
        });
        return list;
      }
    );
  },

  fetchDepartments(service, hospitalId) {
    return service.execute(
      'fetchDepartments',
      () => stubDepartments(hospitalId),
      async () => {
        const response = await service.requestWithRetry('fetchDepartments', (client) =>
          client.get(`/hospitals/${hospitalId}/departments`)
        );
        const list = normalizeList(response.data, 'departments');
        if (!list.length) throw createBizError(503, 'Empty departments response.', 503);
        recordProviderSuccess('medical-api', {
          operation: 'fetch_departments',
          mode: 'live',
          hospitalId,
          total: list.length,
        });
        return list;
      }
    );
  },

  fetchDoctors(service, departmentId) {
    return service.execute(
      'fetchDoctors',
      () => stubDoctors(departmentId),
      async () => {
        const response = await service.requestWithRetry('fetchDoctors', (client) =>
          client.get(`/departments/${departmentId}/doctors`)
        );
        const list = normalizeList(response.data, 'doctors');
        if (!list.length) throw createBizError(503, 'Empty doctors response.', 503);
        recordProviderSuccess('medical-api', {
          operation: 'fetch_doctors',
          mode: 'live',
          departmentId,
          total: list.length,
        });
        return list;
      }
    );
  },

  fetchDoctorDetail(service, doctorId) {
    return service.execute(
      'fetchDoctorDetail',
      () => stubDoctorDetail(doctorId),
      async () => {
        const response = await service.requestWithRetry('fetchDoctorDetail', (client) =>
          client.get(`/doctors/${doctorId}`)
        );
        const data = response.data || {};
        if (!data.id) {
          throw createBizError(404, 'Doctor not found.', 404);
        }
        recordProviderSuccess('medical-api', {
          operation: 'fetch_doctor_detail',
          mode: 'live',
          doctorId,
        });
        return data;
      }
    );
  },
};

module.exports = catalogService;
