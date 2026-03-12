'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { fail } = require('../utils/response');

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
const medicalCatalogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.path}`,
  handler: (_req, res) => fail(res, 429, 'Too many medical directory requests.', null, 429),
});
const medicalWriteLimiter = createRateLimiter({ max: 10, windowSeconds: 60, keyPrefix: 'medical-write' });
const medicalReadLimiter = createRateLimiter({ max: 30, windowSeconds: 60, keyPrefix: 'medical-read' });

router.get('/hospitals', medicalCatalogLimiter, medicalDirectoryController.hospitals);
router.get(
  '/departments',
  medicalCatalogLimiter,
  validateDepartmentsQuery,
  medicalDirectoryController.departments
);
router.get('/doctors', medicalCatalogLimiter, validateDoctorsQuery, medicalDirectoryController.doctors);
router.get(
  '/doctors/:doctorId',
  medicalCatalogLimiter,
  validateDoctorId,
  medicalDirectoryController.doctorDetail
);

router.post(
  '/consult/start',
  auth,
  medicalWriteLimiter,
  validateConsultStart,
  onlineConsultationController.start
);
router.get('/consult', auth, medicalReadLimiter, validateConsultListQuery, onlineConsultationController.list);
router.patch(
  '/consult/:consultationId/status',
  auth,
  medicalWriteLimiter,
  validateConsultStatusUpdate,
  onlineConsultationController.updateStatus
);

router.post('/appointment', auth, medicalWriteLimiter, validateAppointmentCreate, appointmentController.create);
router.get('/appointment', auth, medicalReadLimiter, validateAppointmentListQuery, appointmentController.list);
router.post(
  '/appointment/:appointmentId/cancel',
  auth,
  medicalWriteLimiter,
  validateAppointmentCancel,
  appointmentController.cancel
);

router.get('/reports', auth, medicalReadLimiter, validateMedicalReportsQuery, medicalReportController.list);

module.exports = router;
