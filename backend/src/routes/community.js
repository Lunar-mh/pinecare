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

module.exports = router;
