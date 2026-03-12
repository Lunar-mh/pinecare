'use strict';

const {
  validateAppointmentCancel,
  validateAppointmentCreate,
  validateAppointmentListQuery,
  validateConsultListQuery,
  validateConsultStart,
  validateConsultStatusUpdate,
  validateDepartmentsQuery,
  validateDoctorId,
  validateDoctorsQuery,
  validateMedicalReportsQuery,
} = require('../../src/middleware/validateMedicalIntegration');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

describe('validateMedicalIntegration middleware', () => {
  it('validates directory and doctor identifiers', () => {
    const req = { query: { hospitalId: '2' }, params: { doctorId: '5' } };
    const res = createRes();
    const next = jest.fn();

    validateDepartmentsQuery(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.hospitalId).toBe(2);

    validateDoctorId(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(req.params.doctorId).toBe('5');
  });

  it('normalizes doctor list pagination and rejects invalid values', () => {
    const req = { query: { departmentId: '11', hospitalId: '1', page: '2', pageSize: '15', keyword: ' li ' } };
    const res = createRes();
    const next = jest.fn();

    validateDoctorsQuery(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query).toMatchObject({ departmentId: 11, hospitalId: 1, page: 2, pageSize: 15, keyword: 'li' });

    const badReq = { query: { departmentId: 'oops' } };
    const badRes = createRes();
    validateDoctorsQuery(badReq, badRes, jest.fn());
    expect(badRes.statusCode).toBe(400);
  });

  it('validates consultation payloads', () => {
    const req = { body: { doctorId: '9', department: 'Cardiology' }, params: { consultationId: '3' }, query: { limit: '5' } };
    const res = createRes();
    const next = jest.fn();

    validateConsultStart(req, res, next);
    validateConsultListQuery(req, res, next);
    req.body.consultStatus = 'completed';
    validateConsultStatusUpdate(req, res, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(req.body.doctorId).toBe(9);
    expect(req.query.limit).toBe(5);
  });

  it('validates appointment and report queries', () => {
    const appointmentReq = {
      body: {
        hospitalId: '1',
        doctorId: '2',
        department: 'Cardiology',
        appointmentDate: '2026-03-12',
        timeSlot: '09:00',
      },
      query: { status: 'confirmed', page: '2', pageSize: '20' },
      params: { appointmentId: '7' },
    };
    const res = createRes();
    const next = jest.fn();

    validateAppointmentCreate(appointmentReq, res, next);
    validateAppointmentListQuery(appointmentReq, res, next);
    validateAppointmentCancel(appointmentReq, res, next);

    const reportReq = { query: { reportType: 'Lab', startDate: '2026-03-01', endDate: '2026-03-12', page: '1', pageSize: '10' } };
    validateMedicalReportsQuery(reportReq, res, next);

    expect(next).toHaveBeenCalledTimes(4);
    expect(appointmentReq.body.hospitalId).toBe(1);
    expect(appointmentReq.query.pageSize).toBe(20);
    expect(reportReq.query.startDate).toBe('2026-03-01');
  });
});
