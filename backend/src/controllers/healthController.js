'use strict';

const healthArchiveService = require('../services/healthArchiveService');
const healthSyncService = require('../services/healthSyncService');
const healthManualService = require('../services/healthManualService');
const familyAccessService = require('../services/familyAccessService');
const { ok, fail } = require('../utils/response');
const { sendControllerError } = require('../utils/controllerError');

const healthController = {
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
};

module.exports = healthController;