'use strict';

const communityAdminService = require('../services/communityAdminService');
const { ok, fail } = require('../utils/response');

/**
 * 统一处理业务错误
 * @param {Error} error
 * @param {object} res
 * @param {function} next
 * @returns {any}
 */
function handleError(error, res, next) {
  if (error && error.statusCode) {
    return fail(
      res,
      error.code || error.statusCode,
      error.message || '请求失败',
      null,
      error.statusCode
    );
  }
  return next(error);
}

async function getVolunteers(req, res, next) {
  try {
    const data = await communityAdminService.getVolunteers(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getOrders(req, res, next) {
  try {
    const data = await communityAdminService.getOrders(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const data = await communityAdminService.getOrderDetail(
      req.adminScope.communityId,
      req.params.orderId
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function createOrder(req, res, next) {
  try {
    const data = await communityAdminService.createOrder(req.adminScope.communityId, req.body);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function assignOrder(req, res, next) {
  try {
    const data = await communityAdminService.assignOrder(
      req.adminScope.communityId,
      req.params.orderId,
      req.body,
      {
        userId: req.user && req.user.userId ? Number(req.user.userId) : null,
        role: req.adminScope && req.adminScope.role ? req.adminScope.role : null,
      }
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const data = await communityAdminService.updateOrderStatus(
      req.adminScope.communityId,
      req.params.orderId,
      req.body,
      {
        userId: req.user && req.user.userId ? Number(req.user.userId) : null,
        role: req.adminScope && req.adminScope.role ? req.adminScope.role : null,
      }
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getActivities(req, res, next) {
  try {
    const data = await communityAdminService.getActivities(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function createActivity(req, res, next) {
  try {
    const data = await communityAdminService.createActivity(req.adminScope.communityId, req.body);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getStats(req, res, next) {
  try {
    const data = await communityAdminService.getStats(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getHealthOverview(req, res, next) {
  try {
    const data = await communityAdminService.getHealthOverview(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getMedicationLogs(req, res, next) {
  try {
    const data = await communityAdminService.getMedicationLogs(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function updateMedicationLogStatus(req, res, next) {
  try {
    const data = await communityAdminService.updateMedicationLogStatus(
      req.adminScope.communityId,
      req.params.logId,
      req.body,
      {
        userId: req.user && req.user.userId ? Number(req.user.userId) : null,
        role: req.adminScope && req.adminScope.role ? req.adminScope.role : null,
      }
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getGpsCurrent(req, res, next) {
  try {
    const data = await communityAdminService.getGpsCurrent(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getGpsTrail(req, res, next) {
  try {
    const data = await communityAdminService.getGpsTrail(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getFamilyBindings(req, res, next) {
  try {
    const data = await communityAdminService.getFamilyBindings(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getSosEvents(req, res, next) {
  try {
    const data = await communityAdminService.getSosEvents(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getMedicalReports(req, res, next) {
  try {
    const data = await communityAdminService.getMedicalReports(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function updateSosEventStatus(req, res, next) {
  try {
    const data = await communityAdminService.updateSosEventStatus(
      req.adminScope.communityId,
      req.params.eventId,
      req.body,
      {
        userId: req.user && req.user.userId ? Number(req.user.userId) : null,
        role: req.adminScope && req.adminScope.role ? req.adminScope.role : null,
      }
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getFallEvents(req, res, next) {
  try {
    const data = await communityAdminService.getFallEvents(req.adminScope.communityId, req.query);
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getDrugInteractions(req, res, next) {
  try {
    const data = await communityAdminService.getDrugInteractions(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function updateDrugInteractionStatus(req, res, next) {
  try {
    const data = await communityAdminService.updateDrugInteractionStatus(
      req.adminScope.communityId,
      req.params.interactionId,
      req.body,
      {
        userId: req.user && req.user.userId ? Number(req.user.userId) : null,
        role: req.adminScope && req.adminScope.role ? req.adminScope.role : null,
      }
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getTimeBankServiceHistory(req, res, next) {
  try {
    const data = await communityAdminService.getTimeBankServiceHistory(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function confirmTimeBankService(req, res, next) {
  try {
    const data = await communityAdminService.confirmTimeBankService(
      req.adminScope.communityId,
      req.body,
      {
        userId: req.user && req.user.userId ? Number(req.user.userId) : null,
        role: req.adminScope && req.adminScope.role ? req.adminScope.role : null,
      }
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getTimeBankExchangeHistory(req, res, next) {
  try {
    const data = await communityAdminService.getTimeBankExchangeHistory(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function getTimeBankLeaderboard(req, res, next) {
  try {
    const data = await communityAdminService.getTimeBankLeaderboard(
      req.adminScope.communityId,
      req.query
    );
    return ok(res, data, 'success');
  } catch (error) {
    return handleError(error, res, next);
  }
}

module.exports = {
  getVolunteers,
  getOrders,
  getOrderDetail,
  createOrder,
  assignOrder,
  updateOrderStatus,
  getActivities,
  createActivity,
  getStats,
  getHealthOverview,
  getMedicationLogs,
  updateMedicationLogStatus,
  getGpsCurrent,
  getGpsTrail,
  getFamilyBindings,
  getSosEvents,
  getMedicalReports,
  updateSosEventStatus,
  getFallEvents,
  getDrugInteractions,
  updateDrugInteractionStatus,
  getTimeBankServiceHistory,
  confirmTimeBankService,
  getTimeBankExchangeHistory,
  getTimeBankLeaderboard,
};
