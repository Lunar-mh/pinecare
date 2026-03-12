'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const adminOpsController = require('../controllers/adminOpsController');
const { deprecatedRoute } = require('../utils/deprecation');

const router = express.Router();

router.use(auth, adminAuth);

router.get(
  '/health/overview',
  deprecatedRoute('/community/health/overview'),
  adminOpsController.healthOverview
);
router.get(
  '/medication/logs',
  deprecatedRoute('/community/medication/logs'),
  adminOpsController.medicationLogs
);
router.put(
  '/medication/logs/:logId/status',
  deprecatedRoute('/community/medication/logs/:logId/status'),
  adminOpsController.updateMedicationLogStatus
);
router.get(
  '/gps/current',
  deprecatedRoute('/community/gps/current'),
  adminOpsController.gpsCurrent
);
router.get('/gps/trail', deprecatedRoute('/community/gps/trail'), adminOpsController.gpsTrail);
router.get(
  '/family/bindings',
  deprecatedRoute('/community/family/bindings'),
  adminOpsController.familyBindings
);
router.get(
  '/medical/reports',
  deprecatedRoute('/community/medical/reports'),
  adminOpsController.medicalReports
);

router.get('/sos/events', deprecatedRoute('/community/sos/events'), adminOpsController.sosEvents);
router.put(
  '/sos/events/:eventId/status',
  deprecatedRoute('/community/sos/events/:eventId/status'),
  adminOpsController.updateSosEventStatus
);

router.get(
  '/fall/events',
  deprecatedRoute('/community/fall/events'),
  adminOpsController.fallEvents
);

router.get(
  '/drug-interactions',
  deprecatedRoute('/community/drug-interactions'),
  adminOpsController.drugInteractions
);
router.put(
  '/drug-interactions/:interactionId/status',
  deprecatedRoute('/community/drug-interactions/:interactionId/status'),
  adminOpsController.updateDrugInteractionStatus
);

router.get(
  '/time-bank/service/history',
  deprecatedRoute('/community/time-bank/service/history'),
  adminOpsController.timeBankServiceHistory
);
router.post(
  '/time-bank/service/confirm',
  deprecatedRoute('/community/time-bank/service/confirm'),
  adminOpsController.confirmTimeBankService
);
router.get(
  '/time-bank/exchange/history',
  deprecatedRoute('/community/time-bank/exchange/history'),
  adminOpsController.timeBankExchangeHistory
);
router.get(
  '/time-bank/leaderboard',
  deprecatedRoute('/community/time-bank/leaderboard'),
  adminOpsController.timeBankLeaderboard
);
router.get('/system/integrations', adminOpsController.integrationStatus);
router.get('/system/audit-logs', adminOpsController.auditLogs);
router.get('/system/event-replay', adminOpsController.eventReplay);
router.get('/system/evidence', adminOpsController.evidenceBundle);
router.get('/system/demo/scenarios', adminOpsController.demoScenarios);
router.post('/system/demo/bootstrap', adminOpsController.demoBootstrap);

module.exports = router;
