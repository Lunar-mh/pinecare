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

describe('medical integration API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    medicalDirectoryService.getHospitals.mockResolvedValue({
      source: 'cache',
      list: [{ id: 1, name: 'Hospital A' }],
    });
    medicalDirectoryService.getDepartments.mockResolvedValue({
      source: 'cache',
      list: [{ id: 11, hospitalId: 1, name: 'Cardiology' }],
    });
    medicalDirectoryService.getDoctors.mockResolvedValue({
      source: 'cache',
      list: [{ id: 21, departmentId: 11, name: 'Dr. Li' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    medicalDirectoryService.getDoctorDetail.mockResolvedValue({
      source: 'cache',
      doctor: { id: 21, name: 'Dr. Li' },
    });
    onlineConsultationService.start.mockResolvedValue({
      consultation: { id: 31, consultStatus: 'active' },
      source: 'third_party_stub',
    });
    appointmentService.create.mockResolvedValue({
      duplicate: false,
      idempotencyKey: 'req-1',
      appointment: { id: 41, appointStatus: 'confirmed' },
    });
    appointmentService.listByUser.mockResolvedValue({
      list: [{ id: 41, appointStatus: 'confirmed' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    appointmentService.cancel.mockResolvedValue({
      idempotent: false,
      appointment: { id: 41, appointStatus: 'cancelled' },
    });
    medicalReportService.list.mockResolvedValue({
      source: 'cache',
      list: [{ id: 51, reportNo: 'RPT-001' }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it('GET /medical/hospitals returns unified envelope', async () => {
    const res = await request(createApp()).get('/medical/hospitals');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: 0,
      message: 'ok',
      data: {
        source: 'cache',
        list: [{ id: 1, name: 'Hospital A' }],
      },
    });
  });

  it('GET /medical/departments passes hospitalId query', async () => {
    const res = await request(createApp()).get('/medical/departments?hospitalId=1');

    expect(res.status).toBe(200);
    expect(medicalDirectoryService.getDepartments).toHaveBeenCalledWith('1');
    expect(res.body.code).toBe(0);
  });

  it('GET /medical/doctors passes filter queries', async () => {
    const res = await request(createApp()).get(
      '/medical/doctors?departmentId=11&hospitalId=1&keyword=li&page=1&pageSize=10'
    );

    expect(res.status).toBe(200);
    expect(medicalDirectoryService.getDoctors).toHaveBeenCalledWith({
      departmentId: '11',
      hospitalId: '1',
      keyword: 'li',
      page: '1',
      pageSize: '10',
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
    expect(res.body.code).toBe(0);
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
  });

  it('GET /medical/appointment returns list envelope', async () => {
    const res = await request(createApp()).get('/medical/appointment?status=confirmed&page=1');

    expect(res.status).toBe(200);
    expect(appointmentService.listByUser).toHaveBeenCalledWith(1001, {
      status: 'confirmed',
      page: '1',
      pageSize: undefined,
    });
    expect(res.body.data.total).toBe(1);
  });

  it('POST /medical/appointment/:id/cancel returns cancelled envelope', async () => {
    const res = await request(createApp()).post('/medical/appointment/41/cancel');

    expect(res.status).toBe(200);
    expect(appointmentService.cancel).toHaveBeenCalledWith(1001, '41');
    expect(res.body.message).toBe('cancelled');
  });

  it('GET /medical/reports returns report list envelope', async () => {
    const res = await request(createApp()).get(
      '/medical/reports?reportType=Lab&startDate=2026-03-01&endDate=2026-03-11&page=1&pageSize=10'
    );

    expect(res.status).toBe(200);
    expect(medicalReportService.list).toHaveBeenCalledWith(1001, {
      reportType: 'Lab',
      startDate: '2026-03-01',
      endDate: '2026-03-11',
      page: '1',
      pageSize: '10',
    });
    expect(res.body.data.list[0].reportNo).toBe('RPT-001');
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
