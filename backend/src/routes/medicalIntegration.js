'use strict';

const express = require('express');
const auth = require('../middleware/auth');

const medicalDirectoryController = require('../controllers/medicalDirectoryController');
const onlineConsultationController = require('../controllers/onlineConsultationController');
const appointmentController = require('../controllers/appointmentController');
const medicalReportController = require('../controllers/medicalReportController');

const router = express.Router();

// 医疗目录查询（公开接口）
router.get('/hospitals', medicalDirectoryController.hospitals);
router.get('/departments', medicalDirectoryController.departments);
router.get('/doctors', medicalDirectoryController.doctors);

// 医疗业务接口（需要鉴权）
router.post('/consult/start', auth, onlineConsultationController.start);
router.post('/appointment', auth, appointmentController.create);
router.get('/reports', auth, medicalReportController.list);

module.exports = router;
