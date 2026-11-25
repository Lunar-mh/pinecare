'use strict';

const communityAdminService = require('../services/communityAdminService');
const { ok } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

function handleError(error, res, next) {
  if (error && (error.code || error.statusCode)) {
    return sendControllerError(res, error);
  }
  return next(error);
}

function getActor(req) {
  return {
    userId: req.user && req.user.userId ? Number(req.user.userId) : null,
    role: req.adminScope && req.adminScope.role ? req.adminScope.role : null,
  };
}

function buildScopedHandler(serviceCall) {
  return async (req, res, next) => {
    try {
      const data = await serviceCall(req);
      return ok(res, data, 'success');
    } catch (error) {
      return handleError(error, res, next);
    }
  };
}

module.exports = {
  getVolunteers: buildScopedHandler((req) =>
    communityAdminService.getVolunteers(req.adminScope.communityId, req.query)
  ),
  getOrders: buildScopedHandler((req) =>
    communityAdminService.getOrders(req.adminScope.communityId, req.query)
  ),
  getOrderDetail: buildScopedHandler((req) =>
    communityAdminService.getOrderDetail(req.adminScope.communityId, req.params.orderId)
  ),
  createOrder: buildScopedHandler((req) =>
    communityAdminService.createOrder(req.adminScope.communityId, req.body)
  ),
  assignOrder: buildScopedHandler((req) =>
    communityAdminService.assignOrder(
      req.adminScope.communityId,
      req.params.orderId,
      req.body,
      getActor(req)
    )
  ),
  updateOrderStatus: buildScopedHandler((req) =>
    communityAdminService.updateOrderStatus(
      req.adminScope.communityId,
      req.params.orderId,
      req.body,
      getActor(req)
    )
  ),
  getStats: buildScopedHandler((req) =>
    communityAdminService.getStats(req.adminScope.communityId, req.query)
  ),
  getHealthOverview: buildScopedHandler((req) =>
    communityAdminService.getHealthOverview(req.adminScope.communityId, req.query)
  ),
  getMedicationLogs: buildScopedHandler((req) =>
    communityAdminService.getMedicationLogs(req.adminScope.communityId, req.query)
  ),
  updateMedicationLogStatus: buildScopedHandler((req) =>
    communityAdminService.updateMedicationLogStatus(
      req.adminScope.communityId,
      req.params.logId,
      req.body,
      getActor(req)
    )
  ),
  getGpsCurrent: buildScopedHandler((req) =>
    communityAdminService.getGpsCurrent(req.adminScope.communityId, req.query)
  ),
  getGpsTrail: buildScopedHandler((req) =>
    communityAdminService.getGpsTrail(req.adminScope.communityId, req.query)
  ),
  getFamilyBindings: buildScopedHandler((req) =>
    communityAdminService.getFamilyBindings(req.adminScope.communityId, req.query)
  ),
  getSosEvents: buildScopedHandler((req) =>
    communityAdminService.getSosEvents(req.adminScope.communityId, req.query)
  ),
  updateSosEventStatus: buildScopedHandler((req) =>
    communityAdminService.updateSosEventStatus(
      req.adminScope.communityId,
      req.params.eventId,
      req.body,
      getActor(req)
    )
  ),
  getFallEvents: buildScopedHandler((req) =>
    communityAdminService.getFallEvents(req.adminScope.communityId, req.query)
  ),
};
