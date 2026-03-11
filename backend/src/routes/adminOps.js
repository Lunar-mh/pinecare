'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const adminOpsController = require('../controllers/adminOpsController');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();

router.get(
  '/health/overview',
  auth,
  deprecatedRoute('/community/health/overview'),
  adminOpsController.healthOverview
);
router.get(
  '/medication/logs',
  auth,
  deprecatedRoute('/community/medication/logs'),
  adminOpsController.medicationLogs
);
router.put(
  '/medication/logs/:logId/status',
  auth,
  deprecatedRoute('/community/medication/logs/:logId/status'),
  adminOpsController.updateMedicationLogStatus
);
router.get(
  '/gps/current',
  auth,
  deprecatedRoute('/community/gps/current'),
  adminOpsController.gpsCurrent
);
router.get(
  '/gps/trail',
  auth,
  deprecatedRoute('/community/gps/trail'),
  adminOpsController.gpsTrail
);
router.get(
  '/family/bindings',
  auth,
  deprecatedRoute('/community/family/bindings'),
  adminOpsController.familyBindings
);
router.get(
  '/medical/reports',
  auth,
  deprecatedRoute('/community/medical/reports'),
  adminOpsController.medicalReports
);

router.get(
  '/sos/events',
  auth,
  deprecatedRoute('/community/sos/events'),
  adminOpsController.sosEvents
);
router.put(
  '/sos/events/:eventId/status',
  auth,
  deprecatedRoute('/community/sos/events/:eventId/status'),
  adminOpsController.updateSosEventStatus
);

router.get(
  '/fall/events',
  auth,
  deprecatedRoute('/community/fall/events'),
  adminOpsController.fallEvents
);

router.get(
  '/drug-interactions',
  auth,
  deprecatedRoute('/community/drug-interactions'),
  adminOpsController.drugInteractions
);
router.put(
  '/drug-interactions/:interactionId/status',
  auth,
  deprecatedRoute('/community/drug-interactions/:interactionId/status'),
  adminOpsController.updateDrugInteractionStatus
);

router.get(
  '/time-bank/service/history',
  auth,
  deprecatedRoute('/community/time-bank/service/history'),
  adminOpsController.timeBankServiceHistory
);
router.post(
  '/time-bank/service/confirm',
  auth,
  deprecatedRoute('/community/time-bank/service/confirm'),
  adminOpsController.confirmTimeBankService
);
router.get(
  '/time-bank/exchange/history',
  auth,
  deprecatedRoute('/community/time-bank/exchange/history'),
  adminOpsController.timeBankExchangeHistory
);
router.get(
  '/time-bank/leaderboard',
  auth,
  deprecatedRoute('/community/time-bank/leaderboard'),
  adminOpsController.timeBankLeaderboard
);
router.get('/system/integrations', auth, adminOpsController.integrationStatus);
router.get('/system/audit-logs', auth, adminOpsController.auditLogs);
router.get('/system/demo/scenarios', auth, adminOpsController.demoScenarios);
router.post('/system/demo/bootstrap', auth, adminOpsController.demoBootstrap);

module.exports = router;
