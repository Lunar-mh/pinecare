'use strict';

const { fail } = require('../utils/response');
const {
  optionalString,
  parseEnum,
  parsePagination,
  parsePositiveInt,
  parseYmdDate,
  requireString,
} = require('../utils/requestValidation');

const CONSULT_STATUS = ['pending', 'active', 'completed', 'cancelled'];
const APPOINTMENT_STATUS = ['pending', 'confirmed', 'completed', 'cancelled'];

function validateDepartmentsQuery(req, res, next) {
  const result = parsePositiveInt(req.query.hospitalId, 'hospitalId');
  if (!result.ok) {
    return fail(res, 400, result.message, null, 400);
  }

  req.query.hospitalId = result.data;
  return next();
}

function validateDoctorsQuery(req, res, next) {
  const departmentIdResult = parsePositiveInt(req.query.departmentId, 'departmentId');
  if (!departmentIdResult.ok) {
    return fail(res, 400, departmentIdResult.message, null, 400);
  }

  const hospitalIdResult = parsePositiveInt(req.query.hospitalId, 'hospitalId', {
    required: false,
  });
  if (!hospitalIdResult.ok) {
    return fail(res, 400, hospitalIdResult.message, null, 400);
  }

  const keywordResult = optionalString(req.query.keyword, 'keyword', { maxLength: 100 });
  if (!keywordResult.ok) {
    return fail(res, 400, keywordResult.message, null, 400);
  }

  const paginationResult = parsePagination(req.query, { defaultPage: 1, defaultPageSize: 10 });
  if (!paginationResult.ok) {
    return fail(res, 400, paginationResult.message, null, 400);
  }

  req.query.departmentId = departmentIdResult.data;
  if (hospitalIdResult.data !== null) {
    req.query.hospitalId = hospitalIdResult.data;
  }
  if (keywordResult.data !== null) {
    req.query.keyword = keywordResult.data;
  }
  req.query.page = paginationResult.data.page;
  req.query.pageSize = paginationResult.data.pageSize;
  return next();
}

function validateDoctorId(req, res, next) {
  const result = parsePositiveInt(req.params.doctorId, 'doctorId');
  if (!result.ok) {
    return fail(res, 400, result.message, null, 400);
  }

  req.params.doctorId = String(result.data);
  return next();
}

function validateConsultStart(req, res, next) {
  const doctorIdResult = parsePositiveInt(req.body && req.body.doctorId, 'doctorId');
  if (!doctorIdResult.ok) {
    return fail(res, 400, doctorIdResult.message, null, 400);
  }

  const departmentResult = requireString(req.body && req.body.department, 'department', {
    maxLength: 100,
  });
  if (!departmentResult.ok) {
    return fail(res, 400, departmentResult.message, null, 400);
  }

  req.body.doctorId = doctorIdResult.data;
  req.body.department = departmentResult.data;
  return next();
}

function validateConsultListQuery(req, res, next) {
  const limitResult = parsePositiveInt(req.query.limit, 'limit', { required: false });
  if (!limitResult.ok) {
    return fail(res, 400, limitResult.message, null, 400);
  }

  if (limitResult.data !== null) {
    req.query.limit = limitResult.data;
  }

  return next();
}

function validateConsultStatusUpdate(req, res, next) {
  const consultationIdResult = parsePositiveInt(req.params.consultationId, 'consultationId');
  if (!consultationIdResult.ok) {
    return fail(res, 400, consultationIdResult.message, null, 400);
  }

  const statusResult = parseEnum(req.body && req.body.consultStatus, 'consultStatus', CONSULT_STATUS);
  if (!statusResult.ok) {
    return fail(res, 400, statusResult.message, null, 400);
  }

  req.params.consultationId = String(consultationIdResult.data);
  req.body.consultStatus = statusResult.data;
  return next();
}

function validateAppointmentCreate(req, res, next) {
  const body = req.body || {};
  const hospitalIdResult = parsePositiveInt(body.hospitalId, 'hospitalId');
  if (!hospitalIdResult.ok) {
    return fail(res, 400, hospitalIdResult.message, null, 400);
  }

  const doctorIdResult = parsePositiveInt(body.doctorId, 'doctorId');
  if (!doctorIdResult.ok) {
    return fail(res, 400, doctorIdResult.message, null, 400);
  }

  const departmentResult = requireString(body.department, 'department', { maxLength: 100 });
  if (!departmentResult.ok) {
    return fail(res, 400, departmentResult.message, null, 400);
  }

  const dateResult = parseYmdDate(body.appointmentDate, 'appointmentDate');
  if (!dateResult.ok) {
    return fail(res, 400, dateResult.message, null, 400);
  }

  const timeSlotResult = requireString(body.timeSlot, 'timeSlot', { maxLength: 50 });
  if (!timeSlotResult.ok) {
    return fail(res, 400, timeSlotResult.message, null, 400);
  }

  req.body.hospitalId = hospitalIdResult.data;
  req.body.doctorId = doctorIdResult.data;
  req.body.department = departmentResult.data;
  req.body.appointmentDate = dateResult.data;
  req.body.timeSlot = timeSlotResult.data;
  return next();
}

function validateAppointmentListQuery(req, res, next) {
  const statusResult = parseEnum(req.query.status, 'status', APPOINTMENT_STATUS, {
    required: false,
  });
  if (!statusResult.ok) {
    return fail(res, 400, statusResult.message, null, 400);
  }

  const paginationResult = parsePagination(req.query, { defaultPage: 1, defaultPageSize: 10 });
  if (!paginationResult.ok) {
    return fail(res, 400, paginationResult.message, null, 400);
  }

  if (statusResult.data !== null) {
    req.query.status = statusResult.data;
  }
  req.query.page = paginationResult.data.page;
  req.query.pageSize = paginationResult.data.pageSize;
  return next();
}

function validateAppointmentCancel(req, res, next) {
  const result = parsePositiveInt(req.params.appointmentId, 'appointmentId');
  if (!result.ok) {
    return fail(res, 400, result.message, null, 400);
  }

  req.params.appointmentId = String(result.data);
  return next();
}

function validateMedicalReportsQuery(req, res, next) {
  const reportTypeResult = optionalString(req.query.reportType, 'reportType', { maxLength: 50 });
  if (!reportTypeResult.ok) {
    return fail(res, 400, reportTypeResult.message, null, 400);
  }

  const startDateResult = parseYmdDate(req.query.startDate, 'startDate', { required: false });
  if (!startDateResult.ok) {
    return fail(res, 400, startDateResult.message, null, 400);
  }

  const endDateResult = parseYmdDate(req.query.endDate, 'endDate', { required: false });
  if (!endDateResult.ok) {
    return fail(res, 400, endDateResult.message, null, 400);
  }

  const paginationResult = parsePagination(req.query, { defaultPage: 1, defaultPageSize: 10 });
  if (!paginationResult.ok) {
    return fail(res, 400, paginationResult.message, null, 400);
  }

  if (reportTypeResult.data !== null) {
    req.query.reportType = reportTypeResult.data;
  }
  if (startDateResult.data !== null) {
    req.query.startDate = startDateResult.data;
  }
  if (endDateResult.data !== null) {
    req.query.endDate = endDateResult.data;
  }
  req.query.page = paginationResult.data.page;
  req.query.pageSize = paginationResult.data.pageSize;
  return next();
}

module.exports = {
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
};
