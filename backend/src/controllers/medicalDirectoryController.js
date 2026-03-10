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
  const message = err.message || '医疗目录查询失败';
  return fail(res, code, message, null, status);
}

async function hospitals(req, res) {
  try {
    const data = await medicalDirectoryService.getHospitals();
    return ok(res, data, '医院列表查询成功');
  } catch (err) {
    return handleError(res, err);
  }
}

async function departments(req, res) {
  try {
    const data = await medicalDirectoryService.getDepartments(req.query.hospitalId);
    return ok(res, data, '科室列表查询成功');
  } catch (err) {
    return handleError(res, err);
  }
}

async function doctors(req, res) {
  try {
    const data = await medicalDirectoryService.getDoctors(req.query.departmentId);
    return ok(res, data, '医生列表查询成功');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  hospitals,
  departments,
  doctors,
};
