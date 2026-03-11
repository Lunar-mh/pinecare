'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const adminOpsController = require('../controllers/adminOpsController');

const router = express.Router();

router.get('/health/overview', auth, adminOpsController.healthOverview);
router.get('/medication/logs', auth, adminOpsController.medicationLogs);
router.put('/medication/logs/:logId/status', auth, adminOpsController.updateMedicationLogStatus);
router.get('/gps/current', auth, adminOpsController.gpsCurrent);
router.get('/gps/trail', auth, adminOpsController.gpsTrail);
router.get('/family/bindings', auth, adminOpsController.familyBindings);
router.get('/medical/reports', auth, adminOpsController.medicalReports);

router.get('/sos/events', auth, adminOpsController.sosEvents);
router.put('/sos/events/:eventId/status', auth, adminOpsController.updateSosEventStatus);

router.get('/fall/events', auth, adminOpsController.fallEvents);

router.get('/drug-interactions', auth, adminOpsController.drugInteractions);
router.put(
  '/drug-interactions/:interactionId/status',
  auth,
  adminOpsController.updateDrugInteractionStatus
);

router.get('/time-bank/service/history', auth, adminOpsController.timeBankServiceHistory);
router.post('/time-bank/service/confirm', auth, adminOpsController.confirmTimeBankService);
router.get('/time-bank/exchange/history', auth, adminOpsController.timeBankExchangeHistory);
router.get('/time-bank/leaderboard', auth, adminOpsController.timeBankLeaderboard);
router.get('/system/integrations', auth, adminOpsController.integrationStatus);
router.get('/system/audit-logs', auth, adminOpsController.auditLogs);
router.get('/system/demo/scenarios', auth, adminOpsController.demoScenarios);
router.post('/system/demo/bootstrap', auth, adminOpsController.demoBootstrap);

module.exports = router;
