'use strict';

const express = require('express');
const auth = require('../middleware/auth');

const medicalDirectoryController = require('../controllers/medicalDirectoryController');
const onlineConsultationController = require('../controllers/onlineConsultationController');
const appointmentController = require('../controllers/appointmentController');
const medicalReportController = require('../controllers/medicalReportController');

const router = express.Router();

router.get('/hospitals', medicalDirectoryController.hospitals);
router.get('/departments', medicalDirectoryController.departments);
router.get('/doctors', medicalDirectoryController.doctors);
router.get('/doctors/:doctorId', medicalDirectoryController.doctorDetail);

router.post('/consult/start', auth, onlineConsultationController.start);
router.get('/consult', auth, onlineConsultationController.list);
router.patch('/consult/:consultationId/status', auth, onlineConsultationController.updateStatus);

router.post('/appointment', auth, appointmentController.create);
router.get('/appointment', auth, appointmentController.list);
router.post('/appointment/:appointmentId/cancel', auth, appointmentController.cancel);

router.get('/reports', auth, medicalReportController.list);

module.exports = router;
