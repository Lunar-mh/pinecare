'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const communityAdminController = require('../controllers/communityAdminController');
const {
  validateVolunteerQuery,
  validateOrderQuery,
  validateOrderId,
  validateCreateOrder,
  validateAssignOrder,
  validateUpdateOrderStatus,
  validateActivityQuery,
  validateCreateActivity,
  validateStatsQuery,
  validateHealthOverviewQuery,
  validateMedicationLogsQuery,
  validateMedicationLogId,
  validateMedicationLogStatus,
  validateGpsCurrentQuery,
  validateGpsTrailQuery,
  validateFamilyBindingsQuery,
  validateSosEventQuery,
  validateSosEventId,
  validateMedicalReportsQuery,
  validateUpdateSosEventStatus,
  validateFallEventsQuery,
  validateDrugInteractionsQuery,
  validateDrugInteractionId,
  validateDrugInteractionStatus,
  validateTimeBankServiceHistoryQuery,
  validateTimeBankServiceConfirm,
  validateTimeBankExchangeHistoryQuery,
  validateTimeBankLeaderboardQuery,
} = require('../middleware/validateCommunityAdmin');

const router = express.Router();

// 社区管理接口统一接入鉴权与管理权限校验
router.use(auth, adminAuth);

router.get('/volunteers', validateVolunteerQuery, communityAdminController.getVolunteers);

router.get('/orders', validateOrderQuery, communityAdminController.getOrders);
router.post('/orders', validateCreateOrder, communityAdminController.createOrder);
router.get('/orders/:orderId', validateOrderId, communityAdminController.getOrderDetail);
router.patch(
  '/orders/:orderId/assign',
  validateOrderId,
  validateAssignOrder,
  communityAdminController.assignOrder
);
router.patch(
  '/orders/:orderId/status',
  validateOrderId,
  validateUpdateOrderStatus,
  communityAdminController.updateOrderStatus
);

router.get('/activities', validateActivityQuery, communityAdminController.getActivities);
router.post('/activities', validateCreateActivity, communityAdminController.createActivity);

router.get('/stats', validateStatsQuery, communityAdminController.getStats);
router.get(
  '/health/overview',
  validateHealthOverviewQuery,
  communityAdminController.getHealthOverview
);
router.get(
  '/medication/logs',
  validateMedicationLogsQuery,
  communityAdminController.getMedicationLogs
);
router.put(
  '/medication/logs/:logId/status',
  validateMedicationLogId,
  validateMedicationLogStatus,
  communityAdminController.updateMedicationLogStatus
);
router.get('/gps/current', validateGpsCurrentQuery, communityAdminController.getGpsCurrent);
router.get('/gps/trail', validateGpsTrailQuery, communityAdminController.getGpsTrail);
router.get(
  '/family/bindings',
  validateFamilyBindingsQuery,
  communityAdminController.getFamilyBindings
);
router.get('/sos/events', validateSosEventQuery, communityAdminController.getSosEvents);
router.patch(
  '/sos/events/:eventId/status',
  validateSosEventId,
  validateUpdateSosEventStatus,
  communityAdminController.updateSosEventStatus
);
router.get(
  '/medical/reports',
  validateMedicalReportsQuery,
  communityAdminController.getMedicalReports
);
router.get('/fall/events', validateFallEventsQuery, communityAdminController.getFallEvents);
router.get(
  '/drug-interactions',
  validateDrugInteractionsQuery,
  communityAdminController.getDrugInteractions
);
router.put(
  '/drug-interactions/:interactionId/status',
  validateDrugInteractionId,
  validateDrugInteractionStatus,
  communityAdminController.updateDrugInteractionStatus
);
router.get(
  '/time-bank/service/history',
  validateTimeBankServiceHistoryQuery,
  communityAdminController.getTimeBankServiceHistory
);
router.post(
  '/time-bank/service/confirm',
  validateTimeBankServiceConfirm,
  communityAdminController.confirmTimeBankService
);
router.get(
  '/time-bank/exchange/history',
  validateTimeBankExchangeHistoryQuery,
  communityAdminController.getTimeBankExchangeHistory
);
router.get(
  '/time-bank/leaderboard',
  validateTimeBankLeaderboardQuery,
  communityAdminController.getTimeBankLeaderboard
);

module.exports = router;
