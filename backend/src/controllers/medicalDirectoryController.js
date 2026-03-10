'use strict';

const medicalDirectoryService = require('../services/medicalDirectoryService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code =
    typeof err.code === 'number'
      ? err.code
      : typeof err.statusCode === 'number'
        ? err.statusCode
        : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : code;
  const message = err.message || 'Medical directory request failed.';
  return fail(res, code, message, null, status);
}

async function hospitals(_req, res) {
  try {
    const data = await medicalDirectoryService.getHospitals();
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
}

async function departments(req, res) {
  try {
    const data = await medicalDirectoryService.getDepartments(req.query.hospitalId);
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
}

async function doctors(req, res) {
  try {
    const data = await medicalDirectoryService.getDoctors({
      departmentId: req.query.departmentId,
      hospitalId: req.query.hospitalId,
      keyword: req.query.keyword,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
}

async function doctorDetail(req, res) {
  try {
    const data = await medicalDirectoryService.getDoctorDetail(req.params.doctorId);
    return ok(res, data, 'ok');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  hospitals,
  departments,
  doctors,
  doctorDetail,
};
