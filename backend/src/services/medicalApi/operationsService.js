'use strict';

const { buildRequestOptions, createBizError, normalizeList } = require('./shared');
const {
  stubAppointment,
  stubAppointmentCancellation,
  stubConsultSession,
  stubMedicalReports,
} = require('./stubData');

const operationsService = {
  createConsultSession(service, payload) {
    const requestOptions = buildRequestOptions(payload.requestId);

    return service.execute(
      'createConsultSession',
      () => stubConsultSession(payload),
      async () => {
        const response = await service.requestWithRetry('createConsultSession', (client) =>
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
  },

  createAppointment(service, payload) {
    const requestOptions = buildRequestOptions(payload.requestId);

    return service.execute(
      'createAppointment',
      () => stubAppointment(payload),
      async () => {
        const response = await service.requestWithRetry('createAppointment', (client) =>
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
  },

  cancelAppointment(service, payload = {}) {
    const thirdPartyAppointId = payload.thirdPartyAppointId
      ? String(payload.thirdPartyAppointId)
      : '';
    const requestOptions = buildRequestOptions(payload.requestId);

    return service.execute(
      'cancelAppointment',
      () => stubAppointmentCancellation(payload),
      async () => {
        const targetId = thirdPartyAppointId || String(payload.appointmentId || '').trim();
        if (!targetId) {
          throw createBizError(422, 'appointmentId is required for cancellation.', 422);
        }

        const response = await service.requestWithRetry('cancelAppointment', (client) =>
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
  },

  fetchMedicalReports(service, userId, filters = {}) {
    const requestOptions = buildRequestOptions(filters.requestId);

    return service.execute(
      'fetchMedicalReports',
      () => stubMedicalReports(userId, filters),
      async () => {
        const response = await service.requestWithRetry('fetchMedicalReports', (client) =>
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
  },
};

module.exports = operationsService;
