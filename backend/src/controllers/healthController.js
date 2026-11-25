'use strict';

const healthArchiveService = require('../services/healthArchiveService');
const healthSyncService = require('../services/healthSyncService');
const healthManualService = require('../services/healthManualService');
const familyAccessService = require('../services/familyAccessService');
const { ok, fail } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

const healthController = {
  /**
   * @description 查询今日健康概览快照（支持本人及已绑定的家属代理访问）
   * @param {import('express').Request} req HTTP 请求对象，支持 query.user_id 代理查询
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 今日最新血压、心率及活跃预警列表
   */
  async today(req, res) {
    try {
      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);

      const data = await healthArchiveService.getToday(targetUserId);
      return ok(res, data, 'Health overview loaded.');
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'today_failed',
        defaultMessage: 'Failed to load health overview.',
        moduleName: 'healthController',
        preferErrorMessage: true,
      });
    }
  },

  /**
   * @description 查询健康指标历史趋势图谱（如 7d/30d 血压或心率波动）
   * @param {import('express').Request} req HTTP 请求对象，需提供 query.metric_type 与 query.period
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 趋势点阵数据与聚合统计
   */
  async trend(req, res) {
    try {
      const metricType = String(req.query.metric_type || '').trim();
      const period = String(req.query.period || '').trim();

      if (!metricType) {
        return fail(res, 400, 'metric_type is required.', null, 400);
      }
      if (!period) {
        return fail(res, 400, 'period is required.', null, 400);
      }

      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);

      const data = await healthArchiveService.getTrend(targetUserId, metricType, period);
      return ok(res, data, 'Health trend loaded.');
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'trend_failed',
        defaultMessage: 'Failed to load health trend.',
        moduleName: 'healthController',
        preferErrorMessage: true,
      });
    }
  },

  /**
   * @description 同步穿戴硬件或蓝牙设备采集的体征批量数据
   * @param {import('express').Request} req HTTP 请求对象，包含 body.records 数组
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 批量入库与告警计算结果
   */
  async sync(req, res) {
    try {
      const data = await healthSyncService.sync(req.user.userId, req.body || {});
      return ok(res, data, 'Health data synced.');
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'sync_failed',
        defaultMessage: 'Failed to sync health data.',
        moduleName: 'healthController',
        preferErrorMessage: true,
      });
    }
  },

  /**
   * @description 手动录入健康测量记录（大字版录入高低压与脉搏）
   * @param {import('express').Request} req HTTP 请求对象，包含 systolic, diastolic, pulse, measuredAt
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>} 包含记录ID与异常等级
   */
  async manual(req, res) {
    try {
      const data = await healthManualService.createManualRecord(req.user.userId, req.body || {});
      return ok(res, data, 'Manual health record saved.');
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'manual_failed',
        defaultMessage: 'Failed to save manual health record.',
        moduleName: 'healthController',
        preferErrorMessage: true,
      });
    }
  },

  /**
   * @description 获取最新一次血压测量数据
   * @param {import('express').Request} req HTTP 请求对象
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>}
   */
  async latestBloodPressure(req, res) {
    try {
      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);
      const data = await healthArchiveService.getLatestBloodPressure(targetUserId);
      return ok(res, data, 'Latest blood pressure loaded.');
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'latest_blood_pressure_failed',
        defaultMessage: 'Failed to load latest blood pressure.',
        moduleName: 'healthController',
        preferErrorMessage: true,
      });
    }
  },

  /**
   * @description 获取最新一次心率测量数据
   * @param {import('express').Request} req HTTP 请求对象
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>}
   */
  async latestHeartRate(req, res) {
    try {
      const currentUserId = req.user.userId;
      const targetUserId = req.targetUserId || familyAccessService.resolveTargetUserId(currentUserId, req.query.user_id);
      const data = await healthArchiveService.getLatestHeartRate(targetUserId);
      return ok(res, data, 'Latest heart rate loaded.');
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'latest_heart_rate_failed',
        defaultMessage: 'Failed to load latest heart rate.',
        moduleName: 'healthController',
        preferErrorMessage: true,
      });
    }
  },

  /**
   * @description 消除或确认已知健康风险告警
   * @param {import('express').Request} req HTTP 请求对象，params.id 告警ID
   * @param {import('express').Response} res HTTP 响应对象
   * @returns {Promise<void>}
   */
  async dismissAlert(req, res) {
    try {
      return ok(
        res,
        {
          id: String(req.params.id || ''),
          dismissedAt: new Date().toISOString(),
        },
        'Health alert dismissed.'
      );
    } catch (err) {
      return sendControllerError(res, err, {
        action: 'dismiss_alert_failed',
        defaultMessage: 'Failed to dismiss health alert.',
        moduleName: 'healthController',
        preferErrorMessage: true,
      });
    }
  },
};

module.exports = healthController;
