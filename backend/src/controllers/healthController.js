'use strict';

const healthArchiveService = require('../services/healthArchiveService');
const healthSyncService = require('../services/healthSyncService');
const healthManualService = require('../services/healthManualService');
const familyAccessService = require('../services/familyAccessService');
const { ok, fail } = require('../utils/response');

/**
 * 统一错误响应
 * @param {object} res
 * @param {Error} err
 */
function mapError(res, err) {
  const code = typeof err.code === 'number' ? err.code : 500;
  const status = typeof err.statusCode === 'number' ? err.statusCode : 500;
  return fail(res, code, err.message || '服务器内部错误', null, status);
}

const healthController = {
  /**
   * 获取今日健康数据
   */
  async today(req, res) {
    try {
      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);

      const data = await healthArchiveService.getToday(targetUserId);
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },

  /**
   * 获取趋势数据
   */
  async trend(req, res) {
    try {
      const metricType = String(req.query.metric_type || '').trim();
      const period = String(req.query.period || '').trim();

      if (!metricType) {
        return fail(res, 400, 'metric_type 不能为空', null, 400);
      }
      if (!period) {
        return fail(res, 400, 'period 不能为空', null, 400);
      }

      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);

      const data = await healthArchiveService.getTrend(targetUserId, metricType, period);
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },

  /**
   * 手环同步
   */
  async sync(req, res) {
    try {
      const data = await healthSyncService.sync(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },

  /**
   * 手动录入
   */
  async manual(req, res) {
    try {
      const data = await healthManualService.createManualRecord(req.user.userId, req.body || {});
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },
  /**
   * 获取最新血压记录
   */
  async latestBloodPressure(req, res) {
    try {
      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);
      const data = await healthArchiveService.getLatestBloodPressure(targetUserId);
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },

  /**
   * 获取最新心率记录
   */
  async latestHeartRate(req, res) {
    try {
      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);
      const data = await healthArchiveService.getLatestHeartRate(targetUserId);
      return ok(res, data, 'ok');
    } catch (err) {
      return mapError(res, err);
    }
  },
};

module.exports = healthController;
