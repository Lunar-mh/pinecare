'use strict';

const medicalDirectoryService = require('../services/medicalDirectoryService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

async function hospitals(_req, res) {
  try {
    const data = await medicalDirectoryService.getHospitals();
    return ok(res, data, 'ok');
  } catch (err) {
    return sendControllerError(res, err, {
      action: 'hospitals_failed',
      defaultMessage: 'Medical directory request failed.',
      moduleName: 'medicalDirectoryController',
      preferErrorMessage: true,
    });
  }
}

async function departments(req, res) {
  try {
    const data = await medicalDirectoryService.getDepartments(req.query.hospitalId);
    return ok(res, data, 'ok');
  } catch (err) {
    return sendControllerError(res, err, {
      action: 'departments_failed',
      defaultMessage: 'Medical directory request failed.',
      moduleName: 'medicalDirectoryController',
      preferErrorMessage: true,
    });
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
    return sendControllerError(res, err, {
      action: 'doctors_failed',
      defaultMessage: 'Medical directory request failed.',
      moduleName: 'medicalDirectoryController',
      preferErrorMessage: true,
    });
  }
}

async function doctorDetail(req, res) {
  try {
    const data = await medicalDirectoryService.getDoctorDetail(req.params.doctorId);
    return ok(res, data, 'ok');
  } catch (err) {
    return sendControllerError(res, err, {
      action: 'doctor_detail_failed',
      defaultMessage: 'Medical directory request failed.',
      moduleName: 'medicalDirectoryController',
      preferErrorMessage: true,
    });
  }
}

module.exports = {
  hospitals,
  departments,
  doctors,
  doctorDetail,
};
