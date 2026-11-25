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
  validateUpdateSosEventStatus,
  validateFallEventsQuery,
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
router.get('/fall/events', validateFallEventsQuery, communityAdminController.getFallEvents);

module.exports = router;
