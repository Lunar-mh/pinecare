'use strict';

const medicationPlanService = require('../services/medicationPlanService');
const medicationPlanPresenter = require('../utils/medicationPlanPresenter');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(
    res,
    code,
    err.message || 'Medication plan service is temporarily unavailable.',
    err.data || null,
    status
  );
}

const medicationPlanController = {
  async list(req, res) {
    try {
      const plans = await medicationPlanService.listPlans(req.user.userId);
      return ok(res, medicationPlanPresenter.presentPlanList(plans), 'Medication plans loaded.');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async create(req, res) {
    try {
      const created = await medicationPlanService.createPlan(req.user.userId, req.body || {});
      return ok(res, medicationPlanPresenter.presentPlan(created), 'Medication plan created.');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async update(req, res) {
    try {
      const planId = Number(req.params.id);
      if (!Number.isInteger(planId) || planId <= 0) {
        return fail(res, 400, 'Plan id must be a positive integer.', null, 400);
      }

      const updated = await medicationPlanService.updatePlan(
        req.user.userId,
        planId,
        req.body || {}
      );
      return ok(res, medicationPlanPresenter.presentPlan(updated), 'Medication plan updated.');
    } catch (err) {
      return handleError(res, err);
    }
  },

  async remove(req, res) {
    try {
      const planId = Number(req.params.id);
      if (!Number.isInteger(planId) || planId <= 0) {
        return fail(res, 400, 'Plan id must be a positive integer.', null, 400);
      }

      const data = await medicationPlanService.deletePlan(req.user.userId, planId);
      return ok(res, data, 'Medication plan deleted.');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = medicationPlanController;
