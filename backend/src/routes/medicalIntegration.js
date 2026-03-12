'use strict';

const express = require('express');
const auth = require('../middleware/auth');

const medicalDirectoryController = require('../controllers/medicalDirectoryController');
const onlineConsultationController = require('../controllers/onlineConsultationController');
const appointmentController = require('../controllers/appointmentController');
const medicalReportController = require('../controllers/medicalReportController');
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
} = require('../middleware/validateMedicalIntegration');

const router = express.Router();

router.get('/hospitals', medicalDirectoryController.hospitals);
router.get('/departments', validateDepartmentsQuery, medicalDirectoryController.departments);
router.get('/doctors', validateDoctorsQuery, medicalDirectoryController.doctors);
router.get('/doctors/:doctorId', validateDoctorId, medicalDirectoryController.doctorDetail);

router.post('/consult/start', auth, validateConsultStart, onlineConsultationController.start);
router.get('/consult', auth, validateConsultListQuery, onlineConsultationController.list);
router.patch(
  '/consult/:consultationId/status',
  auth,
  validateConsultStatusUpdate,
  onlineConsultationController.updateStatus
);

router.post('/appointment', auth, validateAppointmentCreate, appointmentController.create);
router.get('/appointment', auth, validateAppointmentListQuery, appointmentController.list);
router.post(
  '/appointment/:appointmentId/cancel',
  auth,
  validateAppointmentCancel,
  appointmentController.cancel
);

router.get('/reports', auth, validateMedicalReportsQuery, medicalReportController.list);

module.exports = router;
