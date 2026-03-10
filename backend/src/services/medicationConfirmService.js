'use strict';

const medicationLogModel = require('../models/medicationLogModel');
const medicationPlanModel = require('../models/medicationPlanModel');

function createBizError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode || code;
  return err;
}

const ALLOWED_CONFIRM_STATUS = ['taken', 'skipped'];

const medicationConfirmService = {
  async confirm(userId, payload) {
    const logId = Number(payload && payload.log_id);
    const status = String((payload && payload.status) || '').trim();

    if (!Number.isInteger(logId) || logId <= 0) {
      throw createBizError(400, 'log_id 必须为正整数', 400);
    }

    if (!ALLOWED_CONFIRM_STATUS.includes(status)) {
      throw createBizError(400, 'status 仅支持 taken 或 skipped', 400);
    }

    const current = await medicationLogModel.getByIdAndUser(logId, userId);
    if (!current) {
      throw createBizError(404, '服药记录不存在或无权访问', 404);
    }

    if (current.status !== 'pending') {
      return {
        idempotent: true,
        log: current,
      };
    }

    const affected = await medicationLogModel.updateStatusPendingOnly(logId, userId, status);

    const latest = await medicationLogModel.getByIdAndUser(logId, userId);

    if (affected > 0 && status === 'taken') {
      await medicationPlanModel.decreaseRemainingQuantity(latest.plan_id, userId);
    }

    return {
      idempotent: false,
      log: latest,
    };
  },

  ALLOWED_CONFIRM_STATUS,
};

module.exports = medicationConfirmService;
