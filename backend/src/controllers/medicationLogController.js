'use strict';

const medicationLogService = require('../services/medicationLogService');
const medicationConfirmService = require('../services/medicationConfirmService');
const { ok, fail } = require('../utils/response');

function handleError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || 'Medication log service is temporarily unavailable.', err.data || null, status);
}

const medicationLogController = {
  /**
   * @description 查询长辈今日用药时间轴清单与服药状态
   * @param {import('express').Request} req HTTP 请求对象，支持 query.date
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 包含今日计划用药项、打卡完成数与未完成预警
   */
  async today(req, res) {
    try {
      const data = await medicationLogService.getTodaySchedule(
        req.user.userId,
        req.query && req.query.date
      );
      return ok(res, data, 'Today medication schedule loaded.');
    } catch (err) {
      return handleError(res, err);
    }
  },

  /**
   * @description 分页查询历史服药打卡记录
   * @param {import('express').Request} req HTTP 请求对象
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>}
   */
  async list(req, res) {
    try {
      const data = await medicationLogService.getLogs(req.user.userId, req.query || {});
      return ok(res, data, 'Medication logs loaded.');
    } catch (err) {
      return handleError(res, err);
    }
  },

  /**
   * @description 确认服药打卡（扣减药量并支持幂等防重复点击）
   * @param {import('express').Request} req HTTP 请求对象，需提供 body.log_id 与可选 taken_at
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>}
   */
  async confirm(req, res) {
    try {
      const data = await medicationConfirmService.confirm(req.user.userId, req.body || {});

      if (data.idempotent) {
        return ok(res, data, 'Medication log already confirmed.');
      }

      return ok(res, data, 'Medication confirmation completed.');
    } catch (err) {
      return handleError(res, err);
    }
  },
};

module.exports = medicationLogController;