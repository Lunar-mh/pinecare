'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { userId: 1001 };
  next();
});

jest.mock('../../src/services/medicalDirectoryService', () => ({
  getHospitals: jest.fn(),
  getDepartments: jest.fn(),
  getDoctors: jest.fn(),
  getDoctorDetail: jest.fn(),
}));

jest.mock('../../src/services/onlineConsultationService', () => ({
  start: jest.fn(),
  listByUser: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock('../../src/services/appointmentService', () => ({
  create: jest.fn(),
  listByUser: jest.fn(),
  cancel: jest.fn(),
}));

jest.mock('../../src/services/medicalReportService', () => ({
  list: jest.fn(),
}));

const medicalDirectoryService = require('../../src/services/medicalDirectoryService');
const onlineConsultationService = require('../../src/services/onlineConsultationService');
const appointmentService = require('../../src/services/appointmentService');
const medicalReportService = require('../../src/services/medicalReportService');
const medicalRouter = require('../../src/routes/medicalIntegration');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/medical', medicalRouter);
  return app;
}

function createMedicalMeta(source) {
  return {
    source,
    mode: source === 'third_party_live' ? 'live' : 'stub',
    fallbackUsed: source !== 'third_party_live',
    diagnosticId: 'diag_001',
    diagnostics: {
      operation: 'medical.contract',
      source,
      mode: source === 'third_party_live' ? 'live' : 'stub',
      fallbackUsed: source !== 'third_party_live',
      reason: 'contract_fixture',
      liveConfigured: source === 'third_party_live',
      fallbackAllowed: true,
      circuitOpen: false,
      missingConfig: source === 'third_party_live' ? [] : ['MEDICAL_API_BASE_URL'],
      generatedAt: '2026-03-11T10:00:00.000Z',
      detail: null,
    },
  };
}

describe('medical integration API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    medicalDirectoryService.getHospitals.mockResolvedValue({
      ...createMedicalMeta('public_curated_dataset'),
      list: [{ id: 1, name: 'Hospital A' }],
    });
    medicalDirectoryService.getDepartments.mockResolvedValue({
      ...createMedicalMeta('cache'),
      list: [{ id: 11, hospitalId: 1, name: 'Cardiology' }],
    });
    medicalDirectoryService.getDoctors.mockResolvedValue({
      ...createMedicalMeta('cache'),
      list: [{ id: 21, departmentId: 11, name: 'Dr. Li' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    medicalDirectoryService.getDoctorDetail.mockResolvedValue({
      ...createMedicalMeta('cache'),
      doctor: { id: 21, name: 'Dr. Li' },
    });
    onlineConsultationService.start.mockResolvedValue({
      ...createMedicalMeta('third_party_live'),
      consultation: { id: 31, consultStatus: 'active' },
    });
    onlineConsultationService.listByUser.mockResolvedValue({
      ...createMedicalMeta('local'),
      list: [{ id: 31, consultStatus: 'active' }],
    });
    onlineConsultationService.updateStatus.mockResolvedValue({
      ...createMedicalMeta('local'),
      consultation: { id: 31, consultStatus: 'completed' },
    });
    appointmentService.create.mockResolvedValue({
      ...createMedicalMeta('third_party_live'),
      duplicate: false,
      idempotencyKey: 'req-1',
      appointment: { id: 41, appointStatus: 'confirmed' },
    });
    appointmentService.listByUser.mockResolvedValue({
      ...createMedicalMeta('local'),
      list: [{ id: 41, appointStatus: 'confirmed' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    appointmentService.cancel.mockResolvedValue({
      ...createMedicalMeta('third_party_live'),
      idempotent: false,
      appointment: { id: 41, appointStatus: 'cancelled' },
    });
    medicalReportService.list.mockResolvedValue({
      ...createMedicalMeta('competition_dataset_sample'),
      list: [{ id: 51, reportNo: 'RPT-001' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it('GET /medical/hospitals returns unified envelope with diagnostics', async () => {
    const res = await request(createApp()).get('/medical/hospitals');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data).toMatchObject({
      source: 'public_curated_dataset',
      mode: 'stub',
      fallbackUsed: true,
      diagnosticId: expect.any(String),
      diagnostics: expect.objectContaining({
        source: 'public_curated_dataset',
      }),
      list: [{ id: 1, name: 'Hospital A' }],
    });
  });

  it('GET /medical/departments passes normalized hospitalId query', async () => {
    const res = await request(createApp()).get('/medical/departments?hospitalId=1');

    expect(res.status).toBe(200);
    expect(medicalDirectoryService.getDepartments).toHaveBeenCalledWith(1);
    expect(res.body.code).toBe(0);
  });

  it('GET /medical/departments rejects invalid hospitalId', async () => {
    const res = await request(createApp()).get('/medical/departments?hospitalId=abc');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('hospitalId must be a positive integer.');
    expect(medicalDirectoryService.getDepartments).not.toHaveBeenCalled();
  });

  it('GET /medical/doctors passes normalized filter queries', async () => {
    const res = await request(createApp()).get(
      '/medical/doctors?departmentId=11&hospitalId=1&keyword= li &page=1&pageSize=10'
    );

    expect(res.status).toBe(200);
    expect(medicalDirectoryService.getDoctors).toHaveBeenCalledWith({
      departmentId: 11,
      hospitalId: 1,
      keyword: 'li',
      page: 1,
      pageSize: 10,
    });
    expect(res.body.data.total).toBe(1);
  });

  it('GET /medical/doctors/:doctorId returns unified envelope', async () => {
    const res = await request(createApp()).get('/medical/doctors/21');

    expect(res.status).toBe(200);
    expect(medicalDirectoryService.getDoctorDetail).toHaveBeenCalledWith('21');
    expect(res.body.data.doctor.id).toBe(21);
  });

  it('POST /medical/consult/start returns unified envelope', async () => {
    const res = await request(createApp())
      .post('/medical/consult/start')
      .send({ doctorId: 21, department: 'Cardiology' });

    expect(res.status).toBe(200);
    expect(onlineConsultationService.start).toHaveBeenCalledWith(1001, {
      doctorId: 21,
      department: 'Cardiology',
    });
    expect(res.body.data).toMatchObject({
      source: 'third_party_live',
      consultation: { id: 31, consultStatus: 'active' },
    });
  });

  it('PATCH /medical/consult/:consultationId/status rejects invalid status early', async () => {
    const res = await request(createApp())
      .patch('/medical/consult/31/status')
      .send({ consultStatus: 'closed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('consultStatus must be one of pending/active/completed/cancelled.');
    expect(onlineConsultationService.updateStatus).not.toHaveBeenCalled();
  });

  it('GET /medical/consult returns unified envelope', async () => {
    const res = await request(createApp()).get('/medical/consult?limit=5');

    expect(res.status).toBe(200);
    expect(onlineConsultationService.listByUser).toHaveBeenCalledWith(1001, 5);
    expect(res.body.data).toMatchObject({
      source: 'local',
      list: [{ id: 31, consultStatus: 'active' }],
    });
  });

  it('PATCH /medical/consult/:consultationId/status returns updated consultation', async () => {
    const res = await request(createApp())
      .patch('/medical/consult/31/status')
      .send({ consultStatus: 'completed' });

    expect(res.status).toBe(200);
    expect(onlineConsultationService.updateStatus).toHaveBeenCalledWith(1001, '31', 'completed');
    expect(res.body.data.consultation.consultStatus).toBe('completed');
  });

  it('POST /medical/appointment returns created envelope', async () => {
    const res = await request(createApp())
      .post('/medical/appointment')
      .set('x-idempotency-key', 'req-1')
      .send({
        hospitalId: 1,
        department: 'Cardiology',
        doctorId: 21,
        appointmentDate: '2026-03-11',
        timeSlot: '09:00',
      });

    expect(res.status).toBe(200);
    expect(appointmentService.create).toHaveBeenCalledWith(
      1001,
      expect.objectContaining({ idempotencyKey: 'req-1' })
    );
    expect(res.body.message).toBe('created');
    expect(res.body.data.source).toBe('third_party_live');
  });

  it('POST /medical/appointment rejects invalid appointment dates', async () => {
    const res = await request(createApp())
      .post('/medical/appointment')
      .send({
        hospitalId: 1,
        department: 'Cardiology',
        doctorId: 21,
        appointmentDate: '03/11/2026',
        timeSlot: '09:00',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('appointmentDate must use YYYY-MM-DD format.');
    expect(appointmentService.create).not.toHaveBeenCalled();
  });

  it('GET /medical/appointment returns list envelope', async () => {
    const res = await request(createApp()).get('/medical/appointment?status=confirmed&page=1');

    expect(res.status).toBe(200);
    expect(appointmentService.listByUser).toHaveBeenCalledWith(1001, {
      status: 'confirmed',
      page: 1,
      pageSize: 10,
    });
    expect(res.body.data.total).toBe(1);
  });

  it('POST /medical/appointment/:id/cancel returns cancelled envelope', async () => {
    const res = await request(createApp()).post('/medical/appointment/41/cancel');

    expect(res.status).toBe(200);
    expect(appointmentService.cancel).toHaveBeenCalledWith(1001, '41');
    expect(res.body.message).toBe('cancelled');
    expect(res.body.data.appointment.appointStatus).toBe('cancelled');
  });

  it('GET /medical/reports returns report list envelope with diagnostics', async () => {
    const res = await request(createApp()).get(
      '/medical/reports?reportType=Lab&startDate=2026-03-01&endDate=2026-03-11&page=1&pageSize=10'
    );

    expect(res.status).toBe(200);
    expect(medicalReportService.list).toHaveBeenCalledWith(1001, {
      reportType: 'Lab',
      startDate: '2026-03-01',
      endDate: '2026-03-11',
      page: 1,
      pageSize: 10,
    });
    expect(res.body.data).toMatchObject({
      source: 'competition_dataset_sample',
      fallbackUsed: true,
      list: [{ id: 51, reportNo: 'RPT-001' }],
    });
  });

  it('GET /medical/reports rejects invalid date filters early', async () => {
    const res = await request(createApp()).get('/medical/reports?startDate=20260301');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('startDate must use YYYY-MM-DD format.');
    expect(medicalReportService.list).not.toHaveBeenCalled();
  });

  it('maps coded service errors to unified error envelope', async () => {
    const error = new Error('Doctor not found.');
    error.code = 404;
    error.statusCode = 404;
    medicalDirectoryService.getDoctorDetail.mockRejectedValue(error);

    const res = await request(createApp()).get('/medical/doctors/404');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      code: 404,
      message: 'Doctor not found.',
      data: null,
    });
  });
});
